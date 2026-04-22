const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { cacheMiddleware } = require('../services/cache');

/* GET /api/analytics/dashboard — admin only */
router.get('/dashboard', authenticate, requireAdmin, cacheMiddleware(60), (req, res) => {
  const today = new Date().toISOString().slice(0,10);
  const week  = new Date(Date.now()-7*86400000).toISOString().slice(0,10);

  const totalUsers     = db.prepare(`SELECT COUNT(*) as c FROM users`).get().c;
  const newUsers7d     = db.prepare(`SELECT COUNT(*) as c FROM users WHERE created_at > ?`).get(week).c;
  const totalRatings   = db.prepare(`SELECT COUNT(*) as c FROM ratings`).get().c;
  const ratingsToday   = db.prepare(`SELECT COUNT(*) as c FROM ratings WHERE created_at > ?`).get(today).c;
  const totalComments  = db.prepare(`SELECT COUNT(*) as c FROM comments WHERE is_removed=0`).get().c;
  const totalViews     = db.prepare(`SELECT COUNT(*) as c FROM page_views`).get().c;
  const viewsToday     = db.prepare(`SELECT COUNT(*) as c FROM page_views WHERE created_at > ?`).get(today).c;
  const totalSearches  = db.prepare(`SELECT COUNT(*) as c FROM search_logs`).get().c;

  const topPages = db.prepare(`
    SELECT path, COUNT(*) as views FROM page_views
    WHERE created_at > ? GROUP BY path ORDER BY views DESC LIMIT 10
  `).all(week);

  const dailyViews = db.prepare(`
    SELECT substr(created_at,1,10) as day, COUNT(*) as views
    FROM page_views WHERE created_at > ?
    GROUP BY day ORDER BY day
  `).all(week);

  const ratingsByDay = db.prepare(`
    SELECT substr(created_at,1,10) as day, COUNT(*) as count, ROUND(AVG(stars),2) as avg_stars
    FROM ratings WHERE created_at > ?
    GROUP BY day ORDER BY day
  `).all(week);

  const topSearches = db.prepare(`
    SELECT query, COUNT(*) as count FROM search_logs
    WHERE created_at > ? GROUP BY query ORDER BY count DESC LIMIT 10
  `).all(week);

  const mostViewed = db.prepare(`
    SELECT entity_type, entity_id, COUNT(*) as views
    FROM page_views WHERE entity_type IS NOT NULL AND created_at > ?
    GROUP BY entity_type, entity_id ORDER BY views DESC LIMIT 10
  `).all(week);

  res.json({
    summary: { totalUsers, newUsers7d, totalRatings, ratingsToday, totalComments, totalViews, viewsToday, totalSearches },
    topPages, dailyViews, ratingsByDay, topSearches, mostViewed
  });
});

/* POST /api/analytics/pageview — client-side tracking */
router.post('/pageview', (req, res) => {
  const { path: p, entity_type, entity_id } = req.body;
  const sessId = req.headers['x-session-id'] || null;
  try {
    db.prepare(`INSERT INTO page_views (path, entity_type, entity_id, session_id, referrer) VALUES (?,?,?,?,?)`)
      .run(p || '/', entity_type || null, entity_id || null, sessId, req.headers.referer || null);
  } catch(e) { /* non-fatal */ }
  res.json({ ok: true });
});

module.exports = router;
