const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireAdmin, requireMod, audit } = require('../middleware/auth');

/* All admin routes require authentication */
router.use(authenticate);

function positiveInt(value, fallback, max) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

/* GET /api/admin/users */
router.get('/users', requireAdmin, (req, res) => {
  const { search='', role='', page=1, limit=50 } = req.query;
  const safePage = positiveInt(page, 1, Number.MAX_SAFE_INTEGER);
  const safeLimit = positiveInt(limit, 50, 100);
  const offset = (safePage - 1) * safeLimit;
  let sql = `SELECT id,username,email,role,display_name,is_verified,is_banned,last_login,created_at FROM users WHERE 1=1`;
  const params = [];
  if (search) { sql += ` AND (username LIKE ? OR email LIKE ?)`; const s=`%${search}%`; params.push(s,s); }
  if (role) { sql += ` AND role=?`; params.push(role); }
  const total = db.prepare(`SELECT COUNT(*) as c FROM users WHERE 1=1${sql.split('WHERE 1=1')[1]}`).get(...params).c;
  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`; params.push(safeLimit, offset);
  const rows  = db.prepare(sql).all(...params);
  res.json({ data: rows, total, page: safePage });
});

/* PATCH /api/admin/users/:id */
router.patch('/users/:id', requireAdmin, (req, res) => {
  const { role, is_banned, ban_reason, is_verified } = req.body;
  const updates=[], vals=[];
  if (role && ['user','moderator','admin'].includes(role)) { updates.push('role=?'); vals.push(role); }
  if (is_banned !== undefined) { updates.push('is_banned=?'); vals.push(is_banned ? 1:0); }
  if (ban_reason !== undefined) { updates.push('ban_reason=?'); vals.push(ban_reason); }
  if (is_verified !== undefined) { updates.push('is_verified=?'); vals.push(is_verified ? 1:0); }
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
  if (!db.prepare(`SELECT id FROM users WHERE id=?`).get(req.params.id)) return res.status(404).json({ error: 'User not found' });
  vals.push(req.params.id);
  db.prepare(`UPDATE users SET ${updates.join(',')} WHERE id=?`).run(...vals);
  audit(req, 'admin_update_user', 'user', req.params.id, null, req.body);
  res.json({ ok: true });
});

/* GET /api/admin/flags — flagged comments */
router.get('/flags', requireMod, (req, res) => {
  const flagged = db.prepare(`
    SELECT c.*, usr.username FROM comments c
    LEFT JOIN users usr ON usr.id=c.user_id
    WHERE c.is_flagged=1 AND c.is_removed=0
    ORDER BY c.created_at DESC LIMIT 50
  `).all();
  res.json({ data: flagged });
});

/* PATCH /api/admin/comments/:id/remove */
router.patch('/comments/:id/remove', requireMod, (req, res) => {
  const result = db.prepare(`UPDATE comments SET is_removed=1, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Comment not found' });
  audit(req, 'remove_comment', 'comment', req.params.id);
  res.json({ ok: true });
});

/* PATCH /api/admin/comments/:id/restore */
router.patch('/comments/:id/restore', requireMod, (req, res) => {
  const result = db.prepare(`UPDATE comments SET is_removed=0, is_flagged=0 WHERE id=?`).run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Comment not found' });
  res.json({ ok: true });
});

/* GET /api/admin/audit */
router.get('/audit', requireAdmin, (req, res) => {
  const { page=1 } = req.query;
  const offset = (Math.max(1,parseInt(page))-1)*50;
  const rows = db.prepare(`
    SELECT al.*, u.username FROM audit_log al
    LEFT JOIN users u ON u.id=al.user_id
    ORDER BY al.created_at DESC LIMIT 50 OFFSET ?
  `).all(offset);
  const total = db.prepare(`SELECT COUNT(*) as c FROM audit_log`).get().c;
  res.json({ data: rows, total });
});

/* GET /api/admin/pending-promises — promises needing review */
router.get('/pending-promises', requireMod, (req, res) => {
  const rows = db.prepare(`
    SELECT pr.*, p.name AS pol_name, p.party
    FROM promises pr JOIN politicians p ON p.id=pr.politician_id
    WHERE pr.status='pend' ORDER BY pr.updated_at DESC LIMIT 50
  `).all();
  res.json({ data: rows });
});

/* GET /api/admin/summary */
router.get('/summary', requireMod, (req, res) => {
  res.json({
    users:         db.prepare(`SELECT COUNT(*) as c FROM users`).get().c,
    politicians:   db.prepare(`SELECT COUNT(*) as c FROM politicians`).get().c,
    promises:      db.prepare(`SELECT COUNT(*) as c FROM promises`).get().c,
    ratings:       db.prepare(`SELECT COUNT(*) as c FROM ratings`).get().c,
    comments:      db.prepare(`SELECT COUNT(*) as c FROM comments WHERE is_removed=0`).get().c,
    flagged:       db.prepare(`SELECT COUNT(*) as c FROM comments WHERE is_flagged=1 AND is_removed=0`).get().c,
    legal_charges: db.prepare(`SELECT COUNT(*) as c FROM legal_charges`).get().c,
    news:          db.prepare(`SELECT COUNT(*) as c FROM news_articles`).get().c,
    polls:         db.prepare(`SELECT COUNT(*) as c FROM polls WHERE is_active=1`).get().c,
    fact_checks:   db.prepare(`SELECT COUNT(*) as c FROM fact_checks`).get().c,
  });
});

module.exports = router;
