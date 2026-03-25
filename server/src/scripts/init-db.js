import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 
    `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'flipbook'}`,
});

async function initDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Creating tables...');
    
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "vector";
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        name VARCHAR(255),
        avatar_url TEXT,
        google_id VARCHAR(255),
        github_id VARCHAR(255),
        plan VARCHAR(50) DEFAULT 'free',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        original_filename VARCHAR(255),
        file_path TEXT NOT NULL,
        thumbnail_path TEXT,
        file_size BIGINT,
        page_count INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        is_public BOOLEAN DEFAULT false,
        embed_code TEXT,
        views_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        chunk_text TEXT NOT NULL,
        embedding VECTOR(384),
        page_number INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✅ Creating indexes...');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks 
      USING ivfflat (embedding vector_cosine_ops);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS document_analytics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        event_type VARCHAR(50) NOT NULL,
        page_number INTEGER,
        duration INTEGER,
        referrer TEXT,
        user_agent TEXT,
        ip_hash VARCHAR(64),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_document_id ON document_analytics(document_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON document_analytics(created_at);
    `);

    console.log('✅ Database initialized successfully!');
    console.log('');
    console.log('📝 You can now:');
    console.log('   1. Start the server: npm run dev');
    console.log('   2. Register a user via POST /api/auth/register');
    console.log('   3. Upload PDFs via POST /api/documents');
    
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

initDatabase();
