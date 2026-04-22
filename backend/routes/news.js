// ── routes/news.js ──
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireMod } = require('../middleware/auth');
const { cacheMiddleware } = require('../services/cache');

router.get('/', cacheMiddleware(120), (req, res) => {
  const { politician_id, state, category, sentiment, page=1, limit=20 } = req.query;
  const offset = (Math.max(1,parseInt(page))-1)*Math.min(50,parseInt(limit));
  let sql = `SELECT * FROM news_articles WHERE 1=1`;
  const params = [];
  if (politician_id) { sql+=` AND politician_id=?`; params.push(politician_id); }
  if (state)         { sql+=` AND state_name=?`;    params.push(state); }
  if (category)      { sql+=` AND category=?`;      params.push(category); }
  if (sentiment)     { sql+=` AND sentiment=?`;     params.push(sentiment); }
  sql+=` ORDER BY published_at DESC LIMIT ? OFFSET ?`; params.push(parseInt(limit), offset);
  const rows  = db.prepare(sql).all(...params);
  const total = db.prepare(`SELECT COUNT(*) as c FROM news_articles`).get().c;
  res.setHeader('X-Total-Count', total);
  res.json({ data: rows, total });
});

router.get('/featured', cacheMiddleware(300), (req, res) => {
  res.json({ data: db.prepare(`SELECT * FROM news_articles WHERE is_featured=1 ORDER BY published_at DESC LIMIT 5`).all() });
});

router.post('/', authenticate, requireMod, (req, res) => {
  const { headline, summary, source_name, source_url, politician_id, state_name, category, sentiment, image_url, published_at, is_featured } = req.body;
  if (!headline || !source_url) return res.status(400).json({ error: 'headline and source_url required' });
  try {
    const result = db.prepare(`INSERT INTO news_articles (headline,summary,source_name,source_url,politician_id,state_name,category,sentiment,image_url,published_at,is_featured) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(headline, summary||null, source_name||null, source_url, politician_id||null, state_name||null, category||null, sentiment||null, image_url||null, published_at||new Date().toISOString(), is_featured?1:0);
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
  if (sentiment) { updates.push('sentiment=?'); vals.push(sentiment); }
  if (!updates.length) return res.status(400).json({ error:'Nothing to update' });
  vals.push(req.params.id);
  db.prepare(`UPDATE news_articles SET ${updates.join(',')} WHERE id=?`).run(...vals);
  res.json({ ok:true });
});

module.exports = router;
