// ── routes/search.js ──
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { cacheMiddleware } = require('../services/cache');

router.get('/', cacheMiddleware(15), (req, res) => {
  const { q = '', type = 'all' } = req.query;
  if (!q || q.length < 2) return res.status(400).json({ error: 'Query too short (min 2 chars)' });
  const pattern = `%${q}%`;
  const results = { politicians: [], parties: [], states: [], news: [], legal: [] };

  if (type === 'all' || type === 'politicians') {
    results.politicians = db.prepare(`
      SELECT p.id, p.name, p.role, p.state, p.party, p.twitter, p.initials, p.tab,
        COUNT(pr.id) as total_promises
      FROM politicians p LEFT JOIN promises pr ON pr.politician_id=p.id
      WHERE p.name LIKE ? OR p.role LIKE ? OR p.state LIKE ?
      GROUP BY p.id ORDER BY p.name LIMIT 8
    `).all(pattern, pattern, pattern);
  }
  if (type === 'all' || type === 'parties') {
    results.parties = db.prepare(`SELECT slug,name,full_name,color,seats_2024 FROM parties WHERE name LIKE ? OR full_name LIKE ? ORDER BY seats_2024 DESC LIMIT 4`).all(pattern, pattern);
  }
  if (type === 'all' || type === 'states') {
    results.states = db.prepare(`SELECT id,name,cm_name,party,gdp_growth,rank_gdp FROM states WHERE name LIKE ? OR cm_name LIKE ? OR party LIKE ? ORDER BY rank_gdp LIMIT 6`).all(pattern, pattern, pattern);
  }
  if (type === 'all' || type === 'news') {
    results.news = db.prepare(`SELECT id,headline,source_name,published_at,sentiment FROM news_articles WHERE headline LIKE ? OR summary LIKE ? ORDER BY published_at DESC LIMIT 6`).all(pattern, pattern);
  }
  if (type === 'all' || type === 'legal') {
    results.legal = db.prepare(`
      SELECT lc.id, lc.title, lc.category, lc.status, lc.severity, p.name AS politician_name, p.party
      FROM legal_charges lc JOIN politicians p ON p.id=lc.politician_id
      WHERE lc.title LIKE ? OR lc.description LIKE ? LIMIT 5
    `).all(pattern, pattern);
  }

  const total = Object.values(results).reduce((a,v)=>a+v.length,0);
  // Log search
  try { db.prepare(`INSERT INTO search_logs (query,results,session_id) VALUES (?,?,?)`).run(q, total, req.headers['x-session-id']||null); } catch(e){}
  res.json({ q, total, results });
});

// Trending searches
router.get('/trending', cacheMiddleware(300), (req, res) => {
  const rows = db.prepare(`
    SELECT query, COUNT(*) as count FROM search_logs
    WHERE created_at > datetime('now','-7 days')
    GROUP BY query ORDER BY count DESC LIMIT 10
  `).all();
  res.json(rows);
});

module.exports = router;
