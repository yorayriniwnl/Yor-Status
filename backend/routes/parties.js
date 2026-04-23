// ── routes/parties.js ──
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { cacheMiddleware } = require('../services/cache');

function safeJsonArray(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

router.get('/', cacheMiddleware(120), (req, res) => {
  const parties = db.prepare(`SELECT * FROM parties ORDER BY seats_2024 DESC`).all();
  const result = parties.map(p => {
    const prev = db.prepare(`SELECT * FROM manifesto_promises WHERE party_id=? AND term='prev' ORDER BY id`).all(p.id);
    const curr = db.prepare(`SELECT * FROM manifesto_promises WHERE party_id=? AND term='curr' ORDER BY id`).all(p.id);
    const cnt = (arr) => arr.reduce((a,r)=>{ a[r.status]=(a[r.status]||0)+1; return a; },{done:0,prog:0,pend:0,brok:0});
    return { ...p, states_json: safeJsonArray(p.states_json), prev:{promises:prev,stats:cnt(prev)}, curr:{promises:curr,stats:cnt(curr)} };
  });
  res.json({ data: result });
});

router.get('/:slug', cacheMiddleware(120), (req, res) => {
  const party = db.prepare(`SELECT * FROM parties WHERE slug=?`).get(req.params.slug);
  if (!party) return res.status(404).json({ error: 'Party not found' });
  const prev = db.prepare(`SELECT * FROM manifesto_promises WHERE party_id=? AND term='prev' ORDER BY id`).all(party.id);
  const curr = db.prepare(`SELECT * FROM manifesto_promises WHERE party_id=? AND term='curr' ORDER BY id`).all(party.id);
  const cnt  = (arr) => arr.reduce((a,r)=>{ a[r.status]=(a[r.status]||0)+1; return a; },{done:0,prog:0,pend:0,brok:0});
  const pols = db.prepare(`
    SELECT p.id,p.name,p.role,p.state,p.tab,
      SUM(CASE WHEN pr.status='done' THEN 1 ELSE 0 END) as done,
      COUNT(pr.id) as total
    FROM politicians p LEFT JOIN promises pr ON pr.politician_id=p.id
    WHERE p.party=? GROUP BY p.id ORDER BY p.tab,p.id
  `).all(party.name);
  res.json({ ...party, states_json: safeJsonArray(party.states_json), prev:{promises:prev,stats:cnt(prev)}, curr:{promises:curr,stats:cnt(curr)}, politicians:pols });
});

module.exports = router;
