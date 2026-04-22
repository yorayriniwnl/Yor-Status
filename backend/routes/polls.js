// =====================================================
// POLLS  routes/polls.js
// =====================================================
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireMod, optionalAuth } = require('../middleware/auth');
const { cacheMiddleware } = require('../services/cache');

router.get('/', cacheMiddleware(30), (req, res) => {
  const { politician_id, active } = req.query;
  let sql = `SELECT po.*, p.name AS pol_name, p.party AS pol_party FROM polls po LEFT JOIN politicians p ON p.id=po.politician_id WHERE 1=1`;
  const params = [];
  if (politician_id) { sql += ` AND po.politician_id=?`; params.push(politician_id); }
  if (active === '1') sql += ` AND po.is_active=1 AND (po.ends_at IS NULL OR po.ends_at > datetime('now'))`;
  sql += ` ORDER BY po.created_at DESC LIMIT 20`;
  const polls = db.prepare(sql).all(...params);
  const result = polls.map(poll => {
    const options = db.prepare(`SELECT * FROM poll_options WHERE poll_id=? ORDER BY id`).all(poll.id);
    return { ...poll, options };
  });
  res.json({ data: result });
});

router.get('/:id', (req, res) => {
  const poll = db.prepare(`SELECT * FROM polls WHERE id=?`).get(req.params.id);
  if (!poll) return res.status(404).json({ error: 'Poll not found' });
  const options = db.prepare(`SELECT * FROM poll_options WHERE poll_id=? ORDER BY id`).all(poll.id);
  const sessId = req.headers['x-session-id'];
  const userVote = sessId ? db.prepare(`SELECT option_id FROM poll_votes WHERE poll_id=? AND session_id=?`).get(poll.id, sessId) : null;
  res.json({ ...poll, options, userVote });
});

router.post('/', authenticate, requireMod, (req, res) => {
  const { title, description, politician_id, options, ends_at } = req.body;
  if (!title || !options || options.length < 2) return res.status(400).json({ error: 'title and at least 2 options required' });
  const result = db.prepare(`INSERT INTO polls (title,description,politician_id,created_by,ends_at) VALUES (?,?,?,?,?)`).run(title, description||null, politician_id||null, req.user.id, ends_at||null);
  for (const opt of options) db.prepare(`INSERT INTO poll_options (poll_id,text) VALUES (?,?)`).run(result.lastInsertRowid, opt);
  res.json({ ok: true, id: result.lastInsertRowid });
});

router.post('/:id/vote', (req, res) => {
  const { option_id } = req.body;
  const sessId = req.headers['x-session-id'];
  if (!sessId) return res.status(400).json({ error: 'x-session-id header required' });
  const poll = db.prepare(`SELECT * FROM polls WHERE id=? AND is_active=1`).get(req.params.id);
  if (!poll) return res.status(404).json({ error: 'Poll not found or closed' });
  const opt = db.prepare(`SELECT id FROM poll_options WHERE id=? AND poll_id=?`).get(option_id, poll.id);
  if (!opt) return res.status(400).json({ error: 'Invalid option' });
  try {
    db.prepare(`INSERT INTO poll_votes (poll_id,option_id,session_id) VALUES (?,?,?)`).run(poll.id, option_id, sessId);
    db.prepare(`UPDATE poll_options SET votes=votes+1 WHERE id=?`).run(option_id);
    db.prepare(`UPDATE polls SET total_votes=total_votes+1 WHERE id=?`).run(poll.id);
    // broadcast via socket
    const updated = db.prepare(`SELECT * FROM poll_options WHERE poll_id=? ORDER BY id`).all(poll.id);
    global.io?.to(`poll:${poll.id}`).emit('poll:update', { id: poll.id, options: updated });
    res.json({ ok: true });
  } catch(e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Already voted' });
    throw e;
  }
});

module.exports = router;
