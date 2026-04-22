const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { optionalAuth, requireMod } = require('../middleware/auth');
const { notify } = require('../services/notifications');

router.get('/', optionalAuth, (req, res) => {
  const { entity_type, entity_id, parent_id } = req.query;
  if (!entity_type || !entity_id) return res.status(400).json({ error: 'entity_type and entity_id required' });
  let sql = `
    SELECT c.*, u.username, u.display_name, u.role as user_role
    FROM comments c LEFT JOIN users u ON u.id=c.user_id
    WHERE c.entity_type=? AND c.entity_id=? AND c.is_removed=0`;
  const params = [entity_type, entity_id];
  if (parent_id !== undefined) { sql += ` AND c.parent_id=?`; params.push(parent_id === 'null' ? null : parent_id); }
  else { sql += ` AND c.parent_id IS NULL`; }
  sql += ` ORDER BY c.upvotes DESC, c.created_at DESC LIMIT 50`;
  const rows = db.prepare(sql).all(...params);
  // attach reply counts
  const result = rows.map(c => ({
    ...c,
    reply_count: db.prepare(`SELECT COUNT(*) as c FROM comments WHERE parent_id=? AND is_removed=0`).get(c.id)?.c || 0
  }));
  res.json({ data: result });
});

router.post('/', optionalAuth, (req, res) => {
  const { entity_type, entity_id, body, parent_id } = req.body;
  const sessId = req.headers['x-session-id'];
  if (!entity_type || !entity_id || !body || !sessId) return res.status(400).json({ error: 'Missing fields or x-session-id header' });
  if (!['politician','state','party','news','legal'].includes(entity_type)) return res.status(400).json({ error: 'Invalid entity_type' });
  if (body.trim().length < 2 || body.length > 2000) return res.status(400).json({ error: 'Comment must be 2-2000 characters' });

  const result = db.prepare(`
    INSERT INTO comments (entity_type, entity_id, user_id, session_id, parent_id, body)
    VALUES (?,?,?,?,?,?)
  `).run(entity_type, entity_id, req.user?.id || null, sessId, parent_id || null, body.trim());

  // Broadcast via socket
  const newComment = db.prepare(`
    SELECT c.*, u.username, u.display_name FROM comments c LEFT JOIN users u ON u.id=c.user_id WHERE c.id=?
  `).get(result.lastInsertRowid);
  global.io?.to(`page:${entity_type}:${entity_id}`).emit('comment:new', newComment);

  res.status(201).json({ ok: true, id: result.lastInsertRowid, comment: newComment });
});

router.post('/:id/vote', optionalAuth, (req, res) => {
  const { vote } = req.body; // 1 or -1
  const sessId = req.headers['x-session-id'];
  if (!sessId || ![1,-1].includes(parseInt(vote))) return res.status(400).json({ error: 'Invalid vote or missing session' });
  try {
    db.prepare(`INSERT INTO comment_votes (comment_id, session_id, vote) VALUES (?,?,?)`).run(req.params.id, sessId, parseInt(vote));
    const col = vote > 0 ? 'upvotes' : 'downvotes';
    db.prepare(`UPDATE comments SET ${col}=${col}+1 WHERE id=?`).run(req.params.id);
    res.json({ ok: true });
  } catch(e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Already voted' });
    throw e;
  }
});

router.post('/:id/flag', optionalAuth, (req, res) => {
  db.prepare(`UPDATE comments SET is_flagged=1 WHERE id=?`).run(req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', optionalAuth, requireMod, (req, res) => {
  db.prepare(`UPDATE comments SET is_removed=1, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
