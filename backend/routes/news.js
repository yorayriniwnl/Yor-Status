// ── routes/news.js ──
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireMod } = require('../middleware/auth');
const { cacheMiddleware, del } = require('../services/cache');

const SENTIMENTS = ['positive', 'neutral', 'negative'];

function positiveInt(value, fallback, max) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function clearNewsCaches() {
  del('cache:/api/news*');
  del('cache:/api/politicians*');
  del('cache:/api/states*');
  del('cache:/api/search*');
}

router.get('/', cacheMiddleware(120), (req, res) => {
  const { politician_id, state, category, sentiment, page=1, limit=20 } = req.query;
  const safePage = positiveInt(page, 1, Number.MAX_SAFE_INTEGER);
  const safeLimit = positiveInt(limit, 20, 50);
  const offset = (safePage - 1) * safeLimit;
  let sql = `SELECT * FROM news_articles WHERE 1=1`;
  const params = [];
  if (politician_id) { sql+=` AND politician_id=?`; params.push(politician_id); }
  if (state)         { sql+=` AND state_name=?`;    params.push(state); }
  if (category)      { sql+=` AND category=?`;      params.push(category); }
  if (sentiment) {
    if (!SENTIMENTS.includes(sentiment)) return res.status(400).json({ error: 'Invalid sentiment' });
    sql+=` AND sentiment=?`; params.push(sentiment);
  }
  const total = db.prepare(`SELECT COUNT(*) as c FROM news_articles WHERE 1=1${sql.split('WHERE 1=1')[1]}`).get(...params).c;
  sql+=` ORDER BY published_at DESC LIMIT ? OFFSET ?`; params.push(safeLimit, offset);
  const rows  = db.prepare(sql).all(...params);
  res.setHeader('X-Total-Count', total);
  res.json({ data: rows, total, page: safePage });
});

router.get('/featured', cacheMiddleware(300), (req, res) => {
  res.json({ data: db.prepare(`SELECT * FROM news_articles WHERE is_featured=1 ORDER BY published_at DESC LIMIT 5`).all() });
});

router.post('/', authenticate, requireMod, (req, res) => {
  const { headline, summary, source_name, source_url, politician_id, state_name, category, sentiment, image_url, published_at, is_featured } = req.body;
  if (!headline || !source_url) return res.status(400).json({ error: 'headline and source_url required' });
  if (sentiment && !SENTIMENTS.includes(sentiment)) return res.status(400).json({ error: 'Invalid sentiment' });
  if (politician_id && !db.prepare(`SELECT id FROM politicians WHERE id=?`).get(politician_id)) return res.status(404).json({ error: 'Politician not found' });
  try {
    const result = db.prepare(`INSERT INTO news_articles (headline,summary,source_name,source_url,politician_id,state_name,category,sentiment,image_url,published_at,is_featured) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(headline, summary||null, source_name||null, source_url, politician_id||null, state_name||null, category||null, sentiment||null, image_url||null, published_at||new Date().toISOString(), is_featured?1:0);
    clearNewsCaches();
    res.json({ ok:true, id: result.lastInsertRowid });
  } catch(e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Article already exists' });
    throw e;
  }
});

router.patch('/:id', authenticate, requireMod, (req, res) => {
  const { is_featured, sentiment } = req.body;
  const updates=[], vals=[];
  if (is_featured!==undefined) { updates.push('is_featured=?'); vals.push(is_featured?1:0); }
  if (sentiment) {
    if (!SENTIMENTS.includes(sentiment)) return res.status(400).json({ error: 'Invalid sentiment' });
    updates.push('sentiment=?'); vals.push(sentiment);
  }
  if (!updates.length) return res.status(400).json({ error:'Nothing to update' });
  if (!db.prepare(`SELECT id FROM news_articles WHERE id=?`).get(req.params.id)) return res.status(404).json({ error: 'Article not found' });
  vals.push(req.params.id);
  db.prepare(`UPDATE news_articles SET ${updates.join(',')} WHERE id=?`).run(...vals);
  clearNewsCaches();
  res.json({ ok:true });
});

module.exports = router;
