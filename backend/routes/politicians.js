const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireAdmin, requireMod, audit } = require('../middleware/auth');
const { optionalAuth } = require('../middleware/auth');
const { cacheMiddleware, del } = require('../services/cache');
const { notifyWatchers } = require('../services/notifications');

/* GET /api/politicians?tab=pm&search=&party=&page=1&limit=50 */
router.get('/', cacheMiddleware(30), (req, res) => {
  const { tab='pm', search='', party='', page=1, limit=50 } = req.query;
  const offset = (Math.max(1, parseInt(page))-1) * Math.min(100, parseInt(limit));
  let sql = `
    SELECT p.*,
      COUNT(DISTINCT pr.id)                                           AS total_promises,
      SUM(CASE WHEN pr.status='done' THEN 1 ELSE 0 END)              AS done_count,
      SUM(CASE WHEN pr.status='prog' THEN 1 ELSE 0 END)              AS prog_count,
      SUM(CASE WHEN pr.status='pend' THEN 1 ELSE 0 END)              AS pend_count,
      SUM(CASE WHEN pr.status='brok' THEN 1 ELSE 0 END)              AS brok_count,
      ROUND(AVG(r.stars),1)                                           AS avg_rating,
      COUNT(DISTINCT r.id)                                            AS rating_count,
      COUNT(DISTINCT lc.id)                                           AS charge_count,
      SUM(CASE WHEN lc.status='active' THEN 1 ELSE 0 END)            AS active_charges
    FROM politicians p
    LEFT JOIN promises pr ON pr.politician_id = p.id
    LEFT JOIN ratings  r  ON r.politician_id  = p.id
    LEFT JOIN legal_charges lc ON lc.politician_id = p.id
    WHERE p.tab = ?`;
  const params = [tab];
  if (search) { sql += ` AND (p.name LIKE ? OR p.role LIKE ? OR p.state LIKE ? OR p.party LIKE ?)`; const s=`%${search}%`; params.push(s,s,s,s); }
  if (party)  { sql += ` AND p.party = ?`; params.push(party); }
  sql += ` GROUP BY p.id ORDER BY p.id LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);
  const rows  = db.prepare(sql).all(...params);
  const total = db.prepare(`SELECT COUNT(*) as c FROM politicians WHERE tab=?`).get(tab).c;
  res.setHeader('X-Total-Count', total);
  res.json({ data: rows, total, page: parseInt(page) });
});

/* GET /api/politicians/parties?tab= */
router.get('/parties', (req, res) => {
  const rows = db.prepare(`SELECT DISTINCT party FROM politicians WHERE tab=? ORDER BY party`).all(req.query.tab||'pm');
  res.json(rows.map(r=>r.party));
});

/* GET /api/politicians/top-rated */
router.get('/top-rated', cacheMiddleware(60), (req, res) => {
  const rows = db.prepare(`
    SELECT p.id,p.name,p.party,p.twitter,p.initials,p.tab,p.state,
      ROUND(AVG(r.stars),1) AS avg_stars, COUNT(r.id) AS rating_count
    FROM politicians p LEFT JOIN ratings r ON r.politician_id=p.id
    GROUP BY p.id HAVING rating_count>0 ORDER BY avg_stars DESC LIMIT 10
  `).all();
  res.json(rows);
});

/* GET /api/politicians/:id */
router.get('/:id', optionalAuth, (req, res) => {
  const pol = db.prepare(`
    SELECT p.*,
      ROUND(AVG(r.stars),1) AS avg_rating,
      COUNT(DISTINCT r.id)  AS rating_count,
      COUNT(DISTINCT lc.id) AS charge_count
    FROM politicians p
    LEFT JOIN ratings r ON r.politician_id=p.id
    LEFT JOIN legal_charges lc ON lc.politician_id=p.id
    WHERE p.id=? GROUP BY p.id
  `).get(req.params.id);
  if (!pol) return res.status(404).json({ error: 'Politician not found' });

  const promises  = db.prepare(`SELECT * FROM promises WHERE politician_id=? ORDER BY status,id`).all(pol.id);
  const verdicts  = db.prepare(`SELECT verdict, COUNT(*) as count FROM ratings WHERE politician_id=? AND verdict IS NOT NULL GROUP BY verdict ORDER BY count DESC`).all(pol.id);
  const timeline  = db.prepare(`SELECT * FROM timeline_events WHERE politician_id=? ORDER BY event_date DESC LIMIT 10`).all(pol.id);
  const factchecks= db.prepare(`SELECT * FROM fact_checks WHERE politician_id=? ORDER BY checked_date DESC LIMIT 5`).all(pol.id);
  const latestAsset = db.prepare(`SELECT * FROM asset_declarations WHERE politician_id=? ORDER BY election_year DESC LIMIT 1`).get(pol.id);
  const recentNews = db.prepare(`SELECT id,headline,source_name,source_url,published_at,sentiment FROM news_articles WHERE politician_id=? ORDER BY published_at DESC LIMIT 5`).all(pol.id);

  // User's own rating
  let userRating = null;
  if (req.user) {
    userRating = db.prepare(`SELECT * FROM ratings WHERE politician_id=? AND user_id=?`).get(pol.id, req.user.id);
  }
  const sessId = req.headers['x-session-id'];
  if (!userRating && sessId) {
    userRating = db.prepare(`SELECT * FROM ratings WHERE politician_id=? AND session_id=?`).get(pol.id, sessId);
  }

  // Watching?
  let isWatching = false;
  if (req.user) {
    isWatching = !!db.prepare(`SELECT id FROM watchlist WHERE user_id=? AND politician_id=?`).get(req.user.id, pol.id);
  }

  // Track view
  try {
    db.prepare(`INSERT INTO page_views (path,entity_type,entity_id,session_id) VALUES (?,?,?,?)`)
      .run(`/politician/${pol.id}`, 'politician', pol.id, sessId || null);
  } catch(e) {}

  res.json({ ...pol, promises, verdicts, timeline, factchecks, latestAsset, recentNews, userRating, isWatching });
});

/* PATCH /api/politicians/:id — admin update bio/education/etc */
router.patch('/:id', authenticate, requireAdmin, (req, res) => {
  const allowed = ['bio','education','constituency','age','net_worth_cr'];
  const updates=[], vals=[];
  for (const key of allowed) if (req.body[key] !== undefined) { updates.push(`${key}=?`); vals.push(req.body[key]); }
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
  updates.push('updated_at=CURRENT_TIMESTAMP'); vals.push(req.params.id);
  const old = db.prepare(`SELECT * FROM politicians WHERE id=?`).get(req.params.id);
  db.prepare(`UPDATE politicians SET ${updates.join(',')} WHERE id=?`).run(...vals);
  audit(req, 'update_politician', 'politician', req.params.id, old, req.body);
  del(`cache:/api/politicians/${req.params.id}`);
  res.json({ ok: true });
});

/* PATCH /api/politicians/:id/promise/:pid — update promise status */
router.patch('/:id/promise/:pid', authenticate, requireMod, (req, res) => {
  const { status } = req.body;
  if (!['done','prog','pend','brok'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const old = db.prepare(`SELECT * FROM promises WHERE id=?`).get(req.params.pid);
  db.prepare(`UPDATE promises SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND politician_id=?`)
    .run(status, req.params.pid, req.params.id);
  audit(req, 'update_promise', 'promise', req.params.pid, old, { status });

  // Notify watchers
  if (old && old.status !== status) {
    const pol = db.prepare(`SELECT name FROM politicians WHERE id=?`).get(req.params.id);
    notifyWatchers(req.params.id, 'promise_update',
      `Promise status changed — ${pol?.name}`,
      `"${old.title}" changed from ${old.status} → ${status}`);
  }

  del(`cache:/api/politicians/${req.params.id}`);
  res.json({ ok: true });
});

/* POST /api/politicians/:id/promise — add promise (admin) */
router.post('/:id/promise', authenticate, requireAdmin, (req, res) => {
  const { title, status='pend', category } = req.body;
  if (!title || !category) return res.status(400).json({ error: 'title and category required' });
  const result = db.prepare(`INSERT INTO promises (politician_id,title,status,category) VALUES (?,?,?,?)`)
    .run(req.params.id, title, status, category);
  audit(req, 'add_promise', 'promise', result.lastInsertRowid, null, { title, status });
  del(`cache:/api/politicians/${req.params.id}`);
  res.json({ ok: true, id: result.lastInsertRowid });
});

module.exports = router;
