// ── routes/timeline.js ──
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireMod } = require('../middleware/auth');

const TYPES = ['election','appointment','scandal','achievement','resignation','arrest','acquittal','policy','other'];

router.get('/:politician_id', (req, res) => {
  const events = db.prepare(`SELECT * FROM timeline_events WHERE politician_id=? ORDER BY event_date DESC`).all(req.params.politician_id);
  res.json({ data: events });
});

router.post('/', authenticate, requireMod, (req, res) => {
  const { politician_id, event_date, title, description, type, source_url } = req.body;
  if (!politician_id || !event_date || !title) return res.status(400).json({ error: 'politician_id, event_date, title required' });
  const eventType = type || 'other';
  if (!TYPES.includes(eventType)) return res.status(400).json({ error: 'Invalid event type' });
  if (!db.prepare(`SELECT id FROM politicians WHERE id=?`).get(politician_id)) return res.status(404).json({ error: 'Politician not found' });
  const result = db.prepare(`INSERT INTO timeline_events (politician_id,event_date,title,description,type,source_url) VALUES (?,?,?,?,?,?)`).run(politician_id, event_date, title, description||null, eventType, source_url||null);
  res.json({ ok: true, id: result.lastInsertRowid });
});

router.delete('/:id', authenticate, requireMod, (req, res) => {
  const result = db.prepare(`DELETE FROM timeline_events WHERE id=?`).run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Timeline event not found' });
  res.json({ ok: true });
});

module.exports = router;
