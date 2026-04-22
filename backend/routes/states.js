const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { cacheMiddleware } = require('../services/cache');

router.get('/', cacheMiddleware(60), (req, res) => {
  const { search='', party='', sort='gdp' } = req.query;
  const orderMap = { gdp:'gdp_growth DESC', hdi:'hdi DESC', welfare:'score_welfare DESC', infra:'score_infra DESC', literacy:'literacy DESC' };
  let sql = `SELECT * FROM states WHERE 1=1`;
  const params = [];
  if (search) { sql+=` AND (name LIKE ? OR cm_name LIKE ? OR party LIKE ?)`; const q=`%${search}%`; params.push(q,q,q); }
  if (party)  { sql+=` AND party=?`; params.push(party); }
  sql += ` ORDER BY ${orderMap[sort]||'gdp_growth DESC'}`;
  const states = db.prepare(sql).all(...params);
  const result = states.map(s => {
    const decisions = db.prepare(`SELECT * FROM state_decisions WHERE state_id=? ORDER BY id`).all(s.id);
    return { ...s, decisions };
  });
  res.json({ data: result });
});

router.get('/parties', cacheMiddleware(300), (req, res) => {
  res.json(db.prepare(`SELECT DISTINCT party FROM states ORDER BY party`).all().map(r=>r.party));
});

router.get('/leaderboard', cacheMiddleware(120), (req, res) => {
  res.json(db.prepare(`SELECT name,cm_name,party,gdp_growth,rank_gdp,score_welfare,score_economy FROM states ORDER BY gdp_growth DESC LIMIT 10`).all());
});

router.get('/:name', cacheMiddleware(60), (req, res) => {
  const s = db.prepare(`SELECT * FROM states WHERE name=?`).get(req.params.name);
  if (!s) return res.status(404).json({ error: 'State not found' });
  const decisions  = db.prepare(`SELECT * FROM state_decisions WHERE state_id=? ORDER BY id`).all(s.id);
  const news       = db.prepare(`SELECT id,headline,source_name,published_at,sentiment FROM news_articles WHERE state_name=? ORDER BY published_at DESC LIMIT 5`).all(s.name);
  const cm         = db.prepare(`SELECT p.*,ROUND(AVG(r.stars),1) as avg_rating FROM politicians p LEFT JOIN ratings r ON r.politician_id=p.id WHERE p.state=? AND p.tab='cm' GROUP BY p.id LIMIT 1`).get(s.name);
  const polls      = db.prepare(`SELECT po.*,(SELECT COUNT(*) FROM poll_options WHERE poll_id=po.id) as option_count FROM polls po JOIN politicians p ON p.id=po.politician_id WHERE p.state=? AND po.is_active=1 LIMIT 3`).all(s.name);
  res.json({ ...s, decisions, news, cm, polls });
});

router.patch('/:name', (req, res) => {
  // Placeholder for future admin state update
  res.json({ ok: true });
});

module.exports = router;
