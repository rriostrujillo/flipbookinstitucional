import { TextEmbedding } from 'fastembed';
import { query } from '../models/db.js';
import { extractTextFromPDF } from './pdfProcessor.js';

let embeddingModel = null;

async function getEmbeddingModel() {
  if (!embeddingModel) {
    console.log('📥 Loading FastEmbed model (first time may take a moment)...');
    embeddingModel = TextEmbedding.fromModel("BAAI/bge-small-en-v1.5", {
      maxLength: 512
    });
    await embeddingModel.initialize();
    console.log('✅ FastEmbed model loaded!');
  }
  return embeddingModel;
}

export async function semanticSearch(userQuery, userId, limit = 10, offset = 0) {
  try {
    const model = await getEmbeddingModel();
    const embeddingResult = await model.embed(userQuery);
    const embedding = Array.from(embeddingResult);
    
    const result = await query(
      `SELECT d.id, d.title, d.description, d.thumbnail_path, d.page_count,
              d.views_count, d.created_at,
              (dc.embedding <=> $1::vector) as similarity,
              dc.chunk_text,
              dc.page_number
       FROM document_chunks dc
       JOIN documents d ON dc.document_id = d.id
       WHERE d.user_id = $2
       ORDER BY dc.embedding <=> $1::vector
       LIMIT $3 OFFSET $4`,
      [JSON.stringify(embedding), userId, limit, offset]
    );

    const groupedResults = groupByDocument(result.rows);
    
    return groupedResults;
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

function groupByDocument(rows) {
  const documents = new Map();
  
  for (const row of rows) {
    if (!documents.has(row.id)) {
      documents.set(row.id, {
        id: row.id,
        title: row.title,
        description: row.description,
        thumbnail_path: row.thumbnail_path,
        page_count: row.page_count,
        views_count: row.views_count,
        created_at: row.created_at,
        matches: []
      });
    }
    
    documents.get(row.id).matches.push({
      page_number: row.page_number,
      text: row.chunk_text,
      similarity: row.similarity
    });
  }
  
  return Array.from(documents.values());
}

export async function indexDocument(documentId, filePath) {
  try {
    const chunks = await extractTextFromPDF(filePath);
    const model = await getEmbeddingModel();
    
    console.log(`📚 Indexing document ${documentId}...`);
    
    for (const chunk of chunks) {
      const text = chunk.text;
      const chunkSize = 1000;
      const overlap = 100;
      
      for (let i = 0; i < text.length; i += chunkSize - overlap) {
        const chunkText = text.slice(i, i + chunkSize);
        
        if (chunkText.trim().length < 50) continue;
        
        const embeddingResult = await model.embed(chunkText);
        const embedding = Array.from(embeddingResult);
        
        await query(
          `INSERT INTO document_chunks (document_id, chunk_text, embedding, page_number)
           VALUES ($1, $2, $3, $4)`,
          [documentId, chunkText, JSON.stringify(embedding), chunk.pageNumber]
        );
      }
    }
    
    console.log(`✅ Document ${documentId} indexed successfully`);
  } catch (error) {
    console.error('Indexing error:', error);
    throw error;
  }
}
