// ── routes/compare.js ──
const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/', (req, res) => {
  const ids = (req.query.ids||'').split(',').map(Number).filter(Boolean).slice(0,4);
  if (ids.length < 2) return res.status(400).json({ error: 'Provide 2-4 politician IDs via ?ids=1,2,3' });
  const data = ids.map(id => {
    const pol = db.prepare(`
      SELECT p.*, ROUND(AVG(r.stars),1) AS avg_rating, COUNT(DISTINCT r.id) AS rating_count,
        SUM(CASE WHEN pr.status='done' THEN 1 ELSE 0 END) AS done_count,
        SUM(CASE WHEN pr.status='prog' THEN 1 ELSE 0 END) AS prog_count,
        SUM(CASE WHEN pr.status='brok' THEN 1 ELSE 0 END) AS brok_count,
        COUNT(DISTINCT pr.id) AS total_promises,
        COUNT(DISTINCT lc.id) AS charge_count,
        SUM(CASE WHEN lc.status='active' THEN 1 ELSE 0 END) AS active_charges
      FROM politicians p LEFT JOIN ratings r ON r.politician_id=p.id
      LEFT JOIN promises pr ON pr.politician_id=p.id
      LEFT JOIN legal_charges lc ON lc.politician_id=p.id
      WHERE p.id=? GROUP BY p.id
    `).get(id);
    if (!pol) return null;
    const latestAsset = db.prepare(`SELECT net_worth, election_year FROM asset_declarations WHERE politician_id=? ORDER BY election_year DESC LIMIT 1`).get(id);
    return { ...pol, latestAsset };
  }).filter(Boolean);
  // Log comparison
  try { db.prepare(`INSERT INTO comparisons (session_id, politician_ids) VALUES (?,?)`).run(req.headers['x-session-id']||'', ids.join(',')); } catch(e) {}
  res.json({ data });
});

module.exports = router;
