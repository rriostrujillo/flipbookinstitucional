import express from 'express';
import { query } from '../models/db.js';
import { semanticSearch } from '../services/searchService.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const offset = (page - 1) * limit;

    const results = await semanticSearch(q, req.user.id, parseInt(limit), offset);

    res.json({
      query: q,
      results,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: results.length
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/documents', async (req, res, next) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const result = await query(
      `SELECT id, title, description, original_filename, page_count, 
              thumbnail_path, views_count, created_at
       FROM documents 
       WHERE user_id = $1 
       AND (title ILIKE $2 OR description ILIKE $3)
       ORDER BY created_at DESC 
       LIMIT $4 OFFSET $5`,
      [req.user.id, `%${q}%`, `%${q}%`, limit, offset]
    );

    res.json({
      query: q,
      documents: result.rows
    });
  } catch (error) {
    next(error);
  }
});

export default router;
