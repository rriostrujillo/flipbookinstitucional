import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { query } from '../models/db.js';
import { processPDF } from '../services/pdfProcessor.js';
import { generateEmbedCode } from '../services/embedService.js';
import { optionalAuth } from '../middleware/auth.js';
import { downloadPDF, isValidPDFUrl } from '../services/pdfDownloader.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, `${uuidv4()}.${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT id, title, description, original_filename, page_count, status, 
              is_public, views_count, created_at, thumbnail_path
       FROM documents 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM documents WHERE user_id = $1',
      [req.user.id]
    );

    res.json({
      documents: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count)
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/public', async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT id, title, description, original_filename, page_count, 
              thumbnail_path, views_count, created_at
       FROM documents 
       WHERE is_public = true 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      documents: result.rows
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT d.*, u.name as owner_name, u.email as owner_email
       FROM documents d
       JOIN users u ON d.user_id = u.id
       WHERE d.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = result.rows[0];

    if (!doc.is_public && (!req.user || req.user.id !== doc.user_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.user && req.user.id === doc.user_id) {
      await query(
        'UPDATE documents SET views_count = views_count + 1 WHERE id = $1',
        [id]
      );
    }

    res.json({ document: doc });
  } catch (error) {
    next(error);
  }
});

router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { title, description } = req.body;

    const result = await query(
      `INSERT INTO documents 
       (user_id, title, description, original_filename, file_path, file_size, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        req.user.id,
        title || req.file.originalname,
        description || null,
        req.file.originalname,
        req.file.filename,
        req.file.size,
        'processing'
      ]
    );

    const document = result.rows[0];

    try {
      const processed = await processPDF(req.file.path, document.id);
      
      await query(
        `UPDATE documents 
         SET page_count = $1, thumbnail_path = $2, status = 'ready', updated_at = NOW()
         WHERE id = $3`,
        [processed.pageCount, processed.thumbnail, document.id]
      );

      document.page_count = processed.pageCount;
      document.thumbnail_path = processed.thumbnail;
      document.status = 'ready';

      if (process.env.BASE_URL) {
        document.embed_code = generateEmbedCode(document.id, process.env.BASE_URL);
      }

      res.status(201).json({ document });
    } catch (processError) {
      await query(
        'UPDATE documents SET status = $1, updated_at = NOW() WHERE id = $2',
        ['error', document.id]
      );
      
      throw processError;
    }
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, is_public } = req.body;

    const checkResult = await query(
      'SELECT id FROM documents WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (is_public !== undefined) {
      updates.push(`is_public = $${paramCount++}`);
      values.push(is_public);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE documents SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json({ document: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM documents WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/embed', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM documents WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = result.rows[0];
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const embedCode = generateEmbedCode(doc.id, baseUrl);

    res.json({ embed_code: embedCode, document_id: id });
  } catch (error) {
    next(error);
  }
});

// NEW: Import PDF from external URL
router.post('/import-url', async (req, res, next) => {
  try {
    const { url, title, description } = req.body;

    if (!url || !isValidPDFUrl(url)) {
      return res.status(400).json({ 
        error: 'Invalid URL. Provide a valid URL ending with .pdf' 
      });
    }

    // Download PDF from external URL
    const downloaded = await downloadPDF(url);

    // Extract filename from URL for original name
    const urlObj = new URL(url);
    const originalFilename = urlObj.pathname.split('/').pop() || 'document.pdf';

    // Save to database
    const result = await query(
      `INSERT INTO documents 
       (user_id, title, description, original_filename, file_path, file_size, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        req.user.id,
        title || originalFilename.replace('.pdf', ''),
        description || null,
        originalFilename,
        downloaded.filename,
        downloaded.size,
        'processing'
      ]
    );

    const document = result.rows[0];

    // Process the PDF
    try {
      const processed = await processPDF(downloaded.filename, document.id);
      
      await query(
        `UPDATE documents 
         SET page_count = $1, thumbnail_path = $2, status = 'ready', updated_at = NOW()
         WHERE id = $3`,
        [processed.pageCount, processed.thumbnail, document.id]
      );

      document.page_count = processed.pageCount;
      document.thumbnail_path = processed.thumbnail;
      document.status = 'ready';

      if (process.env.BASE_URL) {
        document.embed_code = generateEmbedCode(document.id, process.env.BASE_URL);
      }

      res.status(201).json({ document });
    } catch (processError) {
      await query(
        'UPDATE documents SET status = $1, updated_at = NOW() WHERE id = $2',
        ['error', document.id]
      );
      
      throw processError;
    }
  } catch (error) {
    next(error);
  }
});

// NEW: Get PDF directly from external URL (for embedding)
router.get('/external-view', async (req, res, next) => {
  try {
    const { url } = req.query;

    if (!url || !isValidPDFUrl(url)) {
      return res.status(400).json({ 
        error: 'Invalid URL parameter. Provide a valid URL ending with .pdf' 
      });
    }

    // Download and stream the PDF
    const downloaded = await downloadPDF(url);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    
    const fs = await import('fs');
    const stream = fs.createReadStream(downloaded.filePath);
    stream.pipe(res);
    
    stream.on('end', () => {
      // Clean up after sending
      fs.unlink(downloaded.filePath).catch(() => {});
    });
  } catch (error) {
    next(error);
  }
});

export default router;
