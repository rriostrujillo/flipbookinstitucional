import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '../../../data/db.json');

// In-memory database
let db = {
  users: [],
  documents: [],
  document_chunks: [],
  document_analytics: []
};

let dbLoaded = false;

// Load database from file
async function loadDB() {
  if (dbLoaded) return;
  
  try {
    if (existsSync(DB_PATH)) {
      const data = await readFile(DB_PATH, 'utf-8');
      db = JSON.parse(data);
      console.log('📂 Database loaded from file');
    }
  } catch (error) {
    console.log('Starting with fresh database');
  }
  dbLoaded = true;
}

// Save database to file
async function saveDB() {
  try {
    const dir = dirname(DB_PATH);
    await mkdir(dir, { recursive: true });
    await writeFile(DB_PATH, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error('Error saving database:', error.message);
  }
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function initDatabase() {
  await loadDB();
  console.log('✅ Database initialized successfully');
  return true;
}

// Improved query function
export async function query(text, params = []) {
  await loadDB();
  
  const lowerText = text.toLowerCase().trim();
  const paramsCopy = [...params];
  
  // Helper to find user by field
  const findUser = (field, value) => {
    return db.users.find(u => u[field] === value);
  };
  
  // Helper to find document by field
  const findDoc = (field, value) => {
    return db.documents.find(d => d[field] === value);
  };

  // SELECT queries
  if (lowerText.startsWith('select')) {
    
    // SELECT id FROM users WHERE email = $1
    if (lowerText.includes('from users') && lowerText.includes('where email')) {
      const user = findUser('email', paramsCopy[0]);
      return { rows: user ? [{ id: user.id }] : [] };
    }
    
    // SELECT id, email, password_hash, name, avatar_url, plan FROM users WHERE email = $1
    if (lowerText.includes('from users') && lowerText.includes('where email = $1')) {
      const user = findUser('email', paramsCopy[0]);
      if (user) {
        return { rows: [{
          id: user.id,
          email: user.email,
          password_hash: user.password_hash,
          name: user.name,
          avatar_url: user.avatar_url,
          plan: user.plan
        }] };
      }
      return { rows: [] };
    }
    
    // SELECT id, email, name, avatar_url, plan FROM users WHERE id = $1
    if (lowerText.includes('from users') && lowerText.includes('where id = $1')) {
      const user = findUser('id', paramsCopy[0]);
      if (user) {
        return { rows: [{
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: user.avatar_url,
          plan: user.plan,
          created_at: user.created_at
        }] };
      }
      return { rows: [] };
    }
    
    // SELECT id, email, name, plan, created_at from INSERT
    if (lowerText.includes('returning') && lowerText.includes('users')) {
      const newUser = {
        id: generateUUID(),
        email: paramsCopy[0],
        password_hash: paramsCopy[1],
        name: paramsCopy[2],
        avatar_url: null,
        google_id: null,
        github_id: null,
        plan: 'free',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      db.users.push(newUser);
      await saveDB();
      return { rows: [{
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        plan: newUser.plan,
        created_at: newUser.created_at
      }] };
    }
    
    // SELECT * FROM documents WHERE user_id = $1
    if (lowerText.includes('from documents') && lowerText.includes('where user_id')) {
      const userId = paramsCopy[0];
      let results = db.documents.filter(d => d.user_id === userId);
      
      // ORDER BY created_at DESC
      if (lowerText.includes('order by created_at desc')) {
        results = results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }
      
      // LIMIT and OFFSET
      const limitMatch = lowerText.match(/limit\s+\$(\d+)/);
      const offsetMatch = lowerText.match(/offset\s+\$(\d+)/);
      
      let limit = results.length;
      let offset = 0;
      
      if (limitMatch) {
        limit = paramsCopy[parseInt(limitMatch[1]) - 1] || results.length;
      }
      if (offsetMatch) {
        offset = paramsCopy[parseInt(offsetMatch[1]) - 1] || 0;
      }
      
      return { rows: results.slice(offset, offset + limit) };
    }
    
    // SELECT COUNT(*) FROM documents WHERE user_id = $1
    if (lowerText.includes('count(*)') && lowerText.includes('where user_id')) {
      const count = db.documents.filter(d => d.user_id === paramsCopy[0]).length;
      return { rows: [{ count }] };
    }
    
    // SELECT * FROM documents WHERE id = $1
    if (lowerText.includes('from documents') && lowerText.includes('where id = $1')) {
      const doc = findDoc('id', paramsCopy[0]);
      return { rows: doc ? [doc] : [] };
    }
    
    // SELECT with JOIN for document detail
    if (lowerText.includes('join users') && lowerText.includes('where d.id')) {
      const doc = findDoc('id', paramsCopy[0]);
      if (doc) {
        const user = findUser('id', doc.user_id);
        return { rows: [{
          ...doc,
          owner_name: user?.name || 'Unknown',
          owner_email: user?.email || ''
        }] };
      }
      return { rows: [] };
    }
    
    // INSERT INTO documents RETURNING
    if (lowerText.includes('insert into documents') && lowerText.includes('returning')) {
      const newDoc = {
        id: generateUUID(),
        user_id: paramsCopy[0],
        title: paramsCopy[1],
        description: paramsCopy[2],
        original_filename: paramsCopy[3],
        file_path: paramsCopy[4],
        file_size: paramsCopy[5],
        status: paramsCopy[6],
        thumbnail_path: null,
        page_count: 0,
        is_public: false,
        embed_code: null,
        views_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      db.documents.push(newDoc);
      await saveDB();
      return { rows: [newDoc] };
    }
    
    // UPDATE documents
    if (lowerText.includes('update documents') && lowerText.includes('set')) {
      const whereMatch = text.match(/where\s+id\s+=\s+\$(\d+)/i);
      if (whereMatch) {
        const docId = paramsCopy[parseInt(whereMatch[1]) - 1];
        const docIndex = db.documents.findIndex(d => d.id === docId);
        
        if (docIndex !== -1) {
          // Handle multiple SET patterns
          if (lowerText.includes('page_count') || lowerText.includes('thumbnail_path') || lowerText.includes('status')) {
            // This is a processing update - parse SET differently
            if (lowerText.includes('page_count = $1')) {
              db.documents[docIndex].page_count = paramsCopy[0];
            }
            if (lowerText.includes('thumbnail_path = $2')) {
              db.documents[docIndex].thumbnail_path = paramsCopy[1];
            }
            if (lowerText.includes('status =')) {
              const statusMatch = text.match(/status\s+=\s+\$1/i);
              if (statusMatch) {
                db.documents[docIndex].status = paramsCopy[2] || paramsCopy[0];
              }
            }
          }
          db.documents[docIndex].updated_at = new Date().toISOString();
          await saveDB();
          return { rows: [db.documents[docIndex]] };
        }
      }
    }
    
    // DELETE FROM documents
    if (lowerText.includes('delete from documents')) {
      const docId = paramsCopy[0];
      const userId = paramsCopy[1];
      const docIndex = db.documents.findIndex(d => d.id === docId && d.user_id === userId);
      
      if (docIndex !== -1) {
        const deleted = db.documents.splice(docIndex, 1)[0];
        await saveDB();
        return { rows: [deleted] };
      }
    }
    
    // Title search
    if (lowerText.includes('ilike')) {
      const userId = paramsCopy[0];
      const searchTerm = paramsCopy[1].replace(/%/g, '');
      const results = db.documents.filter(d => 
        d.user_id === userId && 
        (d.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
         (d.description && d.description.toLowerCase().includes(searchTerm.toLowerCase())))
      );
      return { rows: results };
    }
  }
  
  console.log('Unhandled query:', text.substring(0, 100));
  return { rows: [] };
}

export const pool = { query };