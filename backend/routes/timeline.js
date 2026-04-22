// ── routes/timeline.js ──
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireMod } = require('../middleware/auth');

router.get('/:politician_id', (req, res) => {
  const events = db.prepare(`SELECT * FROM timeline_events WHERE politician_id=? ORDER BY event_date DESC`).all(req.params.politician_id);
  res.json({ data: events });
});

router.post('/', authenticate, requireMod, (req, res) => {
  const { politician_id, event_date, title, description, type, source_url } = req.body;
  if (!politician_id || !event_date || !title) return res.status(400).json({ error: 'politician_id, event_date, title required' });
  const result = db.prepare(`INSERT INTO timeline_events (politician_id,event_date,title,description,type,source_url) VALUES (?,?,?,?,?,?)`).run(politician_id, event_date, title, description||null, type||'other', source_url||null);
  res.json({ ok: true, id: result.lastInsertRowid });
});

router.delete('/:id', authenticate, requireMod, (req, res) => {
  db.prepare(`DELETE FROM timeline_events WHERE id=?`).run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
