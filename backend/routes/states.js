const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { cacheMiddleware, del } = require('../services/cache');

function clearStateCaches() {
  del('cache:/api/states*');
  del('cache:/api/search*');
}

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
  const cm         = db.prepare(`SELECT p.*,ROUND(AVG(r.stars),1) as avg_rating FROM politicians p LEFT JOIN ratings r ON r.politician_id=p.id AND r.is_flagged=0 WHERE p.state=? AND p.tab='cm' GROUP BY p.id LIMIT 1`).get(s.name);
  const polls      = db.prepare(`SELECT po.*,(SELECT COUNT(*) FROM poll_options WHERE poll_id=po.id) as option_count FROM polls po JOIN politicians p ON p.id=po.politician_id WHERE p.state=? AND po.is_active=1 LIMIT 3`).all(s.name);
  res.json({ ...s, decisions, news, cm, polls });
});

router.patch('/:name', authenticate, requireAdmin, (req, res) => {
  const allowed = [
    'cm_name', 'party', 'gdp_growth', 'gdp_size', 'hdi', 'literacy', 'unemployment',
    'rank_gdp', 'score_infra', 'score_welfare', 'score_economy', 'score_govn',
    'score_env', 'population_cr', 'area_km2', 'capital'
  ];
  const updates = [];
  const vals = [];

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates.push(`${key}=?`);
      vals.push(req.body[key]);
    }
  }

  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
  const old = db.prepare(`SELECT id FROM states WHERE name=?`).get(req.params.name);
  if (!old) return res.status(404).json({ error: 'State not found' });

  updates.push('updated_at=CURRENT_TIMESTAMP');
  vals.push(req.params.name);
  db.prepare(`UPDATE states SET ${updates.join(',')} WHERE name=?`).run(...vals);
  clearStateCaches();
  res.json({ ok: true });
});

module.exports = router;
