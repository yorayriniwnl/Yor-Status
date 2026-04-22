const jwt = require('jsonwebtoken');
const db  = require('../db');

const SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_production';

/* ── Generate token ── */
function signToken(userId) {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

/* ── Verify token middleware ── */
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const payload = jwt.verify(header.slice(7), SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id=? AND is_banned=0').get(payload.sub);
    if (!user) return res.status(401).json({ error: 'User not found or banned' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/* ── Optional auth (attaches user if token present, no error if not) ── */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), SECRET);
      const user = db.prepare('SELECT * FROM users WHERE id=? AND is_banned=0').get(payload.sub);
      if (user) req.user = user;
    } catch (e) { /* ignore */ }
  }
  next();
}

/* ── Role guards ── */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

const requireAdmin = requireRole('admin', 'superadmin');
const requireMod   = requireRole('moderator', 'admin', 'superadmin');

/* ── Audit log helper ── */
function audit(req, action, entity_type, entity_id, old_val, new_val) {
  try {
    db.prepare(`INSERT INTO audit_log (user_id,action,entity_type,entity_id,old_value,new_value,ip_address) VALUES (?,?,?,?,?,?,?)`)
      .run(req.user?.id || null, action, entity_type || null, entity_id || null,
           old_val ? JSON.stringify(old_val) : null,
           new_val ? JSON.stringify(new_val) : null,
           req.ip);
  } catch(e) { /* non-fatal */ }
}

module.exports = { signToken, authenticate, optionalAuth, requireAdmin, requireMod, requireRole, audit };
