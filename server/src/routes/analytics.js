import express from 'express';
import crypto from 'crypto';
import { query } from '../models/db.js';

const router = express.Router();

function hashIP(ip) {
  return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 64);
}

router.post('/track', async (req, res, next) => {
  try {
    const { document_id, event_type, page_number, duration, referrer } = req.body;
    const user_agent = req.headers['user-agent'];
    const ip_hash = hashIP(req.ip || req.connection.remoteAddress);
    const user_id = req.user?.id || null;

    await query(
      `INSERT INTO document_analytics (document_id, user_id, event_type, page_number, duration, referrer, user_agent, ip_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [document_id, user_id, event_type, page_number, duration, referrer, user_agent, ip_hash]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/document/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { period = '7d' } = req.query;

    let dateFilter = "NOW() - INTERVAL '7 days'";
    if (period === '30d') dateFilter = "NOW() - INTERVAL '30 days'";
    if (period === '90d') dateFilter = "NOW() - INTERVAL '90 days'";
    if (period === 'all') dateFilter = "NOW() - INTERVAL '10 years'";

    const result = await query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_events,
        COUNT(DISTINCT ip_hash) as unique_visitors,
        COUNT(DISTINCT CASE WHEN event_type = 'page_flip' THEN ip_hash END) as readers,
        SUM(CASE WHEN event_type = 'view' THEN 1 ELSE 0 END) as views,
        SUM(CASE WHEN event_type = 'page_flip' THEN 1 ELSE 0 END) as page_flips,
        AVG(CASE WHEN event_type = 'page_flip' AND duration > 0 THEN duration END) as avg_time
       FROM document_analytics
       WHERE document_id = $1 AND created_at > ${dateFilter}
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [id]
    );

    const summary = await query(
      `SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT ip_hash) as unique_visitors,
        COUNT(DISTINCT CASE WHEN event_type = 'page_flip' THEN ip_hash END) as readers,
        SUM(CASE WHEN event_type = 'view' THEN 1 ELSE 0 END) as total_views,
        SUM(CASE WHEN event_type = 'page_flip' THEN 1 ELSE 0 END) as total_page_flips,
        AVG(CASE WHEN duration > 0 THEN duration END) as avg_time_seconds
       FROM document_analytics
       WHERE document_id = $1 AND created_at > ${dateFilter}`,
      [id]
    );

    const topPages = await query(
      `SELECT page_number, COUNT(*) as views
       FROM document_analytics
       WHERE document_id = $1 AND page_number IS NOT NULL AND created_at > ${dateFilter}
       GROUP BY page_number
       ORDER BY views DESC
       LIMIT 10`,
      [id]
    );

    res.json({
      timeline: result.rows,
      summary: summary.rows[0],
      top_pages: topPages.rows
    });
  } catch (error) {
    next(error);
  }
});

router.get('/overview', async (req, res, next) => {
  try {
    const { period = '30d' } = req.query;

    let dateFilter = "NOW() - INTERVAL '30 days'";
    if (period === '7d') dateFilter = "NOW() - INTERVAL '7 days'";
    if (period === '90d') dateFilter = "NOW() - INTERVAL '90 days'";
    if (period === 'all') dateFilter = "NOW() - INTERVAL '10 years'";

    const result = await query(
      `SELECT 
        COUNT(DISTINCT da.ip_hash) as unique_visitors,
        SUM(CASE WHEN da.event_type = 'view' THEN 1 ELSE 0 END) as total_views,
        SUM(CASE WHEN da.event_type = 'page_flip' THEN 1 ELSE 0 END) as total_page_flips,
        COUNT(DISTINCT da.document_id) as active_documents
       FROM document_analytics da
       JOIN documents d ON da.document_id = d.id
       WHERE d.user_id = $1 AND da.created_at > ${dateFilter}`,
      [req.user.id]
    );

    const topDocs = await query(
      `SELECT d.id, d.title, d.thumbnail_path,
        COUNT(DISTINCT da.ip_hash) as visitors,
        SUM(CASE WHEN da.event_type = 'view' THEN 1 ELSE 0 END) as views
       FROM document_analytics da
       JOIN documents d ON da.document_id = d.id
       WHERE d.user_id = $1 AND da.created_at > ${dateFilter}
       GROUP BY d.id, d.title, d.thumbnail_path
       ORDER BY views DESC
       LIMIT 5`,
      [req.user.id]
    );

    res.json({
      summary: result.rows[0],
      top_documents: topDocs.rows
    });
  } catch (error) {
    next(error);
  }
});

export default router;
