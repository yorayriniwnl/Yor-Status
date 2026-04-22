const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, (req, res) => {
  const items = db.prepare(`
    SELECT w.*, p.name, p.role, p.state, p.party, p.twitter, p.initials, p.tab,
      ROUND(AVG(r.stars),1) AS avg_rating
    FROM watchlist w
    JOIN politicians p ON p.id=w.politician_id
    LEFT JOIN ratings r ON r.politician_id=p.id
    WHERE w.user_id=? GROUP BY w.id ORDER BY w.created_at DESC
  `).all(req.user.id);
  res.json({ data: items });
});

router.post('/:politician_id', authenticate, (req, res) => {
  const pol = db.prepare(`SELECT id,name FROM politicians WHERE id=?`).get(req.params.politician_id);
  if (!pol) return res.status(404).json({ error: 'Politician not found' });
  try {
    db.prepare(`INSERT INTO watchlist (user_id, politician_id, alert_email, alert_push) VALUES (?,?,?,?)`)
      .run(req.user.id, pol.id, req.body.alert_email??1, req.body.alert_push??1);
    res.json({ ok: true, watching: true });
  } catch(e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Already watching' });
    throw e;
  }
});

router.delete('/:politician_id', authenticate, (req, res) => {
  db.prepare(`DELETE FROM watchlist WHERE user_id=? AND politician_id=?`).run(req.user.id, req.params.politician_id);
  res.json({ ok: true, watching: false });
});

module.exports = router;
