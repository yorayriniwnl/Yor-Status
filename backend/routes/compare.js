// ── routes/compare.js ──
const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/', (req, res) => {
  const ids = [...new Set((req.query.ids||'').split(',').map(Number).filter(Boolean))].slice(0,4);
  if (ids.length < 2) return res.status(400).json({ error: 'Provide 2-4 politician IDs via ?ids=1,2,3' });
  const data = ids.map(id => {
    const pol = db.prepare(`
      SELECT p.*,
        ROUND(r.avg_rating, 1) AS avg_rating,
        COALESCE(r.rating_count, 0) AS rating_count,
        COALESCE(pr.done_count, 0) AS done_count,
        COALESCE(pr.prog_count, 0) AS prog_count,
        COALESCE(pr.brok_count, 0) AS brok_count,
        COALESCE(pr.total_promises, 0) AS total_promises,
        COALESCE(lc.charge_count, 0) AS charge_count,
        COALESCE(lc.active_charges, 0) AS active_charges
      FROM politicians p
      LEFT JOIN (
        SELECT politician_id, AVG(stars) AS avg_rating, COUNT(*) AS rating_count
        FROM ratings WHERE is_flagged=0 GROUP BY politician_id
      ) r ON r.politician_id=p.id
      LEFT JOIN (
        SELECT politician_id,
          COUNT(*) AS total_promises,
          SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) AS done_count,
          SUM(CASE WHEN status='prog' THEN 1 ELSE 0 END) AS prog_count,
          SUM(CASE WHEN status='brok' THEN 1 ELSE 0 END) AS brok_count
        FROM promises GROUP BY politician_id
      ) pr ON pr.politician_id=p.id
      LEFT JOIN (
        SELECT politician_id,
          COUNT(*) AS charge_count,
          SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active_charges
        FROM legal_charges GROUP BY politician_id
      ) lc ON lc.politician_id=p.id
      WHERE p.id=?
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
