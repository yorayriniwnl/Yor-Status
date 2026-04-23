const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, optionalAuth, requireMod } = require('../middleware/auth');

router.get('/', optionalAuth, (req, res) => {
  const { entity_type, entity_id, parent_id } = req.query;
  if (!entity_type || !entity_id) return res.status(400).json({ error: 'entity_type and entity_id required' });
  let sql = `
    SELECT c.*, u.username, u.display_name, u.role as user_role
    FROM comments c LEFT JOIN users u ON u.id=c.user_id
    WHERE c.entity_type=? AND c.entity_id=? AND c.is_removed=0`;
  const params = [entity_type, entity_id];
  if (parent_id !== undefined && parent_id !== 'null' && parent_id !== '') {
    sql += ` AND c.parent_id=?`;
    params.push(parent_id);
  } else {
    sql += ` AND c.parent_id IS NULL`;
  }
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
  const text = typeof body === 'string' ? body.trim() : '';
  if (!entity_type || !entity_id || !body || !sessId) return res.status(400).json({ error: 'Missing fields or x-session-id header' });
  if (!['politician','state','party','news','legal'].includes(entity_type)) return res.status(400).json({ error: 'Invalid entity_type' });
  if (text.length < 2 || text.length > 2000) return res.status(400).json({ error: 'Comment must be 2-2000 characters' });
  if (parent_id) {
    const parent = db.prepare(`SELECT id, entity_type, entity_id FROM comments WHERE id=? AND is_removed=0`).get(parent_id);
    if (!parent) return res.status(404).json({ error: 'Parent comment not found' });
    if (parent.entity_type !== entity_type || String(parent.entity_id) !== String(entity_id)) {
      return res.status(400).json({ error: 'Parent comment belongs to a different entity' });
    }
  }

  const result = db.prepare(`
    INSERT INTO comments (entity_type, entity_id, user_id, session_id, parent_id, body)
    VALUES (?,?,?,?,?,?)
  `).run(entity_type, entity_id, req.user?.id || null, sessId, parent_id || null, text);

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
  const voteValue = parseInt(vote, 10);
  if (!sessId || ![1,-1].includes(voteValue)) return res.status(400).json({ error: 'Invalid vote or missing session' });
  if (!db.prepare(`SELECT id FROM comments WHERE id=? AND is_removed=0`).get(req.params.id)) return res.status(404).json({ error: 'Comment not found' });
  try {
    db.transaction(() => {
      db.prepare(`INSERT INTO comment_votes (comment_id, session_id, vote) VALUES (?,?,?)`).run(req.params.id, sessId, voteValue);
      const col = voteValue > 0 ? 'upvotes' : 'downvotes';
      db.prepare(`UPDATE comments SET ${col}=${col}+1 WHERE id=?`).run(req.params.id);
    })();
    res.json({ ok: true });
  } catch(e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Already voted' });
    throw e;
  }
});

router.post('/:id/flag', optionalAuth, (req, res) => {
  const result = db.prepare(`UPDATE comments SET is_flagged=1 WHERE id=? AND is_removed=0`).run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Comment not found' });
  res.json({ ok: true });
});

router.delete('/:id', authenticate, requireMod, (req, res) => {
  const result = db.prepare(`UPDATE comments SET is_removed=1, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Comment not found' });
  res.json({ ok: true });
});

module.exports = router;
