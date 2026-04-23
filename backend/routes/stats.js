// ── routes/stats.js ──
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { cacheMiddleware } = require('../services/cache');

router.get('/', cacheMiddleware(30), (req, res) => {
  const prMap = {};
  db.prepare(`SELECT status, COUNT(*) as c FROM promises GROUP BY status`).all().forEach(r => { prMap[r.status]=r.c; });
  const partyStats = db.prepare(`
    SELECT p.party, COUNT(DISTINCT p.id) as pol_count,
      SUM(CASE WHEN pr.status='done' THEN 1 ELSE 0 END) as done,
      SUM(CASE WHEN pr.status='brok' THEN 1 ELSE 0 END) as brok,
      COUNT(pr.id) as total
    FROM politicians p LEFT JOIN promises pr ON pr.politician_id=p.id
    GROUP BY p.party ORDER BY pol_count DESC
  `).all();
  const topRated = db.prepare(`
    SELECT p.id,p.name,p.role,p.state,p.party,p.twitter,p.initials,p.tab,
      ROUND(AVG(r.stars),1) as avg_stars
    FROM politicians p LEFT JOIN ratings r ON r.politician_id=p.id AND r.is_flagged=0
    GROUP BY p.id ORDER BY avg_stars DESC NULLS LAST LIMIT 6
  `).all();
  const mostBroken = db.prepare(`
    SELECT p.id,p.name,p.party,p.twitter,p.initials,
      SUM(CASE WHEN pr.status='brok' THEN 1 ELSE 0 END) as broken_count
    FROM politicians p JOIN promises pr ON pr.politician_id=p.id
    GROUP BY p.id ORDER BY broken_count DESC LIMIT 6
  `).all();
  const legalHeat = db.prepare(`
    SELECT p.id,p.name,p.party,p.twitter,p.initials,
      COUNT(lc.id) as total_charges,
      SUM(CASE WHEN lc.status='active' THEN 1 ELSE 0 END) as active
    FROM politicians p LEFT JOIN legal_charges lc ON lc.politician_id=p.id
    GROUP BY p.id HAVING total_charges>0 ORDER BY active DESC, total_charges DESC LIMIT 6
  `).all();
  res.json({
    promises: { done:prMap.done||0, prog:prMap.prog||0, pend:prMap.pend||0, brok:prMap.brok||0, total: Object.values(prMap).reduce((a,b)=>a+b,0) },
    totalPoliticians: db.prepare(`SELECT COUNT(*) as c FROM politicians`).get().c,
    totalRatings:     db.prepare(`SELECT COUNT(*) as c FROM ratings`).get().c,
    totalComments:    db.prepare(`SELECT COUNT(*) as c FROM comments WHERE is_removed=0`).get().c,
    totalLegal:       db.prepare(`SELECT COUNT(*) as c FROM legal_charges`).get().c,
    partyStats, topRated, mostBroken, legalHeat
  });
});

module.exports = router;
