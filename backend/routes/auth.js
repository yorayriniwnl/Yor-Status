const express  = require('express');
const bcrypt   = require('bcryptjs');
const router   = express.Router();
const db       = require('../db');
const { signToken, authenticate, audit } = require('../middleware/auth');

function cleanEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/* ── POST /api/auth/register ── */
router.post('/register', async (req, res) => {
  const { username, email, password, display_name } = req.body;
  const usernameValue = typeof username === 'string' ? username.trim() : '';
  const emailValue = cleanEmail(email);
  const displayName = typeof display_name === 'string' && display_name.trim() ? display_name.trim() : usernameValue;
  if (!usernameValue || !emailValue || typeof password !== 'string') return res.status(400).json({ error: 'username, email, and password are required' });
  if (!validEmail(emailValue)) return res.status(400).json({ error: 'Valid email required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(usernameValue)) return res.status(400).json({ error: 'Username: 3-30 chars, letters/numbers/underscore only' });

  try {
    const hash = await bcrypt.hash(password, 12);
    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, display_name)
      VALUES (?,?,?,?)
    `).run(usernameValue.toLowerCase(), emailValue, hash, displayName);

    const user = db.prepare('SELECT id,username,email,role,display_name,created_at FROM users WHERE id=?').get(result.lastInsertRowid);
    const token = signToken(user.id);
    audit(req, 'register', 'user', user.id, null, { username: usernameValue });
    res.status(201).json({ token, user });
  } catch(e) {
    if (e.message.includes('UNIQUE')) {
      const field = e.message.includes('email') ? 'email' : 'username';
      return res.status(409).json({ error: `This ${field} is already taken` });
    }
    throw e;
  }
});

/* ── POST /api/auth/login ── */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const emailValue = cleanEmail(email);
  if (!emailValue || typeof password !== 'string') return res.status(400).json({ error: 'email and password required' });

  const user = db.prepare('SELECT * FROM users WHERE email=?').get(emailValue);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (user.is_banned) return res.status(403).json({ error: 'Account banned: ' + (user.ban_reason || 'violation') });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  db.prepare('UPDATE users SET last_login=CURRENT_TIMESTAMP WHERE id=?').run(user.id);
  const token = signToken(user.id);
  const { password_hash, ...safe } = user;
  audit(req, 'login', 'user', user.id);
  res.json({ token, user: safe });
});

/* ── POST /api/auth/admin-setup ── (one-time) ── */
router.post('/admin-setup', async (req, res) => {
  const { setup_key, email, password } = req.body;
  const SETUP_KEY = process.env.ADMIN_SETUP_KEY || 'changeme123';
  const emailValue = cleanEmail(email);
  if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_SETUP_KEY) {
    return res.status(500).json({ error: 'ADMIN_SETUP_KEY must be configured in production' });
  }
  if (setup_key !== SETUP_KEY) return res.status(403).json({ error: 'Invalid setup key' });
  if (!validEmail(emailValue) || typeof password !== 'string') return res.status(400).json({ error: 'Valid email and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  const existingAdmin = db.prepare(`SELECT id FROM users WHERE role='admin' OR role='superadmin'`).get();
  if (existingAdmin) return res.status(409).json({ error: 'Admin already exists' });

  try {
    const hash = await bcrypt.hash(password, 12);
    const result = db.prepare(`INSERT INTO users (username,email,password_hash,role,display_name) VALUES (?,?,?,?,?)`)
      .run('admin', emailValue, hash, 'superadmin', 'Administrator');
    const user = db.prepare('SELECT id,username,email,role FROM users WHERE id=?').get(result.lastInsertRowid);
    res.json({ token: signToken(user.id), user });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Admin username or email already exists' });
    throw e;
  }
});

/* ── GET /api/auth/me ── */
router.get('/me', authenticate, (req, res) => {
  const { password_hash, ...safe } = req.user;
  const notifCount = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id=? AND is_read=0').get(req.user.id);
  const watchCount = db.prepare('SELECT COUNT(*) as c FROM watchlist WHERE user_id=?').get(req.user.id);
  res.json({ ...safe, unread_notifications: notifCount.c, watching: watchCount.c });
});

/* ── PATCH /api/auth/profile ── */
router.patch('/profile', authenticate, async (req, res) => {
  const { display_name, current_password, new_password } = req.body;
  const updates = [], vals = [];

  if (display_name !== undefined) {
    if (typeof display_name !== 'string' || !display_name.trim()) return res.status(400).json({ error: 'display_name must be a non-empty string' });
    updates.push('display_name=?'); vals.push(display_name.trim());
  }

  if (new_password !== undefined) {
    if (typeof new_password !== 'string') return res.status(400).json({ error: 'new_password must be a string' });
    if (typeof current_password !== 'string') return res.status(400).json({ error: 'current_password required' });
    const ok = await bcrypt.compare(current_password, req.user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Wrong current password' });
    if (new_password.length < 8) return res.status(400).json({ error: 'New password too short' });
    updates.push('password_hash=?');
    vals.push(await bcrypt.hash(new_password, 12));
  }

  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
  vals.push(req.user.id);
  db.prepare(`UPDATE users SET ${updates.join(',')} WHERE id=?`).run(...vals);
  res.json({ ok: true });
});

/* ── POST /api/auth/logout ── */
router.post('/logout', authenticate, (req, res) => {
  audit(req, 'logout', 'user', req.user.id);
  res.json({ ok: true });
});

module.exports = router;
