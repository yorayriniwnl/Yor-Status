const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate } = require('../middleware/auth');
const { markRead } = require('../services/notifications');

router.get('/', authenticate, (req, res) => {
  const notifs = db.prepare(`SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50`).all(req.user.id);
  const unread = notifs.filter(n => !n.is_read).length;
  res.json({ data: notifs, unread });
});

router.patch('/read-all', authenticate, (req, res) => {
  markRead(req.user.id);
  res.json({ ok: true });
});

router.patch('/:id/read', authenticate, (req, res) => {
  markRead(req.user.id, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', authenticate, (req, res) => {
  db.prepare(`DELETE FROM notifications WHERE id=? AND user_id=?`).run(req.params.id, req.user.id);
  res.json({ ok: true });
});

module.exports = router;
