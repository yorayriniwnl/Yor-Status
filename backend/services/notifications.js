const db = require('../db');

// Push notification to a user (stored in DB; WebSocket emits it live)
function notify(userId, type, title, body, entity_type = null, entity_id = null) {
  try {
    const res = db.prepare(`
      INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
      VALUES (?,?,?,?,?,?)
    `).run(userId, type, title, body, entity_type, entity_id);

    // Try to emit via socket if io is available globally
    const io = global.io;
    if (io) {
      io.to(`user:${userId}`).emit('notification', {
        id: res.lastInsertRowid, type, title, body, entity_type, entity_id,
        created_at: new Date().toISOString()
      });
    }
  } catch(e) { console.error('Notify error:', e.message); }
}

// Notify all watchers of a politician when something changes
function notifyWatchers(politicianId, type, title, body) {
  try {
    const watchers = db.prepare(`SELECT user_id FROM watchlist WHERE politician_id=?`).all(politicianId);
    watchers.forEach(w => notify(w.user_id, type, title, body, 'politician', politicianId));
  } catch(e) { console.error('NotifyWatchers error:', e.message); }
}

// Mark notifications read
function markRead(userId, notifId) {
  if (notifId) {
    db.prepare(`UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?`).run(notifId, userId);
  } else {
    db.prepare(`UPDATE notifications SET is_read=1 WHERE user_id=?`).run(userId);
  }
}

module.exports = { notify, notifyWatchers, markRead };
