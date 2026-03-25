import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 
    `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'flipbook'}`,
});

export const initDatabase = async () => {
  const client = await pool.connect();
  
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        chunk_text TEXT NOT NULL,
        embedding VECTOR(384),
        page_number INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS document_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
  } finally {
    client.release();
  }
};

export const query = (text, params) => pool.query(text, params);
