const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireAdmin, requireMod, audit } = require('../middleware/auth');
const { optionalAuth } = require('../middleware/auth');
const { cacheMiddleware, del } = require('../services/cache');
const { notifyWatchers } = require('../services/notifications');

const VALID_TABS = ['pm', 'cm', 'opp'];
const VALID_PROMISE_STATUSES = ['done', 'prog', 'pend', 'brok'];

function positiveInt(value, fallback, max) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function clearPoliticianCaches() {
  del('cache:/api/politicians*');
  del('cache:/api/stats*');
  del('cache:/api/parties*');
  del('cache:/api/search*');
}

/* GET /api/politicians?tab=pm&search=&party=&page=1&limit=50 */
router.get('/', cacheMiddleware(30), (req, res) => {
  const { tab='pm', search='', party='', page=1, limit=50 } = req.query;
  const safeTab = VALID_TABS.includes(tab) ? tab : 'pm';
  const safePage = positiveInt(page, 1, Number.MAX_SAFE_INTEGER);
  const safeLimit = positiveInt(limit, 50, 100);
  const offset = (safePage - 1) * safeLimit;
  let sql = `
    SELECT p.*,
      COALESCE(pr.total_promises, 0) AS total_promises,
      COALESCE(pr.done_count, 0) AS done_count,
      COALESCE(pr.prog_count, 0) AS prog_count,
      COALESCE(pr.pend_count, 0) AS pend_count,
      COALESCE(pr.brok_count, 0) AS brok_count,
      ROUND(r.avg_rating, 1) AS avg_rating,
      COALESCE(r.rating_count, 0) AS rating_count,
      COALESCE(lc.charge_count, 0) AS charge_count,
      COALESCE(lc.active_charges, 0) AS active_charges
    FROM politicians p
    LEFT JOIN (
      SELECT politician_id,
        COUNT(*) AS total_promises,
        SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) AS done_count,
        SUM(CASE WHEN status='prog' THEN 1 ELSE 0 END) AS prog_count,
        SUM(CASE WHEN status='pend' THEN 1 ELSE 0 END) AS pend_count,
        SUM(CASE WHEN status='brok' THEN 1 ELSE 0 END) AS brok_count
      FROM promises GROUP BY politician_id
    ) pr ON pr.politician_id = p.id
    LEFT JOIN (
      SELECT politician_id, AVG(stars) AS avg_rating, COUNT(*) AS rating_count
      FROM ratings WHERE is_flagged=0 GROUP BY politician_id
    ) r ON r.politician_id = p.id
    LEFT JOIN (
      SELECT politician_id,
        COUNT(*) AS charge_count,
        SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active_charges
      FROM legal_charges GROUP BY politician_id
    ) lc ON lc.politician_id = p.id
    WHERE p.tab = ?`;
  const params = [safeTab];
  if (search) { sql += ` AND (p.name LIKE ? OR p.role LIKE ? OR p.state LIKE ? OR p.party LIKE ?)`; const s=`%${search}%`; params.push(s,s,s,s); }
  if (party)  { sql += ` AND p.party = ?`; params.push(party); }
  const countSql = `SELECT COUNT(*) AS c FROM politicians p ${sql.slice(sql.indexOf('WHERE p.tab = ?'))}`;
  sql += ` ORDER BY p.id LIMIT ? OFFSET ?`;
  const total = db.prepare(countSql).get(...params).c;
  params.push(safeLimit, offset);
  const rows  = db.prepare(sql).all(...params);
  res.setHeader('X-Total-Count', total);
  res.json({ data: rows, total, page: safePage });
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
    FROM politicians p LEFT JOIN ratings r ON r.politician_id=p.id AND r.is_flagged=0
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
    LEFT JOIN ratings r ON r.politician_id=p.id AND r.is_flagged=0
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
  if (!old) return res.status(404).json({ error: 'Politician not found' });
  db.prepare(`UPDATE politicians SET ${updates.join(',')} WHERE id=?`).run(...vals);
  audit(req, 'update_politician', 'politician', req.params.id, old, req.body);
  clearPoliticianCaches();
  res.json({ ok: true });
});

/* PATCH /api/politicians/:id/promise/:pid — update promise status */
router.patch('/:id/promise/:pid', authenticate, requireMod, (req, res) => {
  const { status } = req.body;
  if (!VALID_PROMISE_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const old = db.prepare(`SELECT * FROM promises WHERE id=? AND politician_id=?`).get(req.params.pid, req.params.id);
  if (!old) return res.status(404).json({ error: 'Promise not found' });
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

  clearPoliticianCaches();
  res.json({ ok: true });
});

/* POST /api/politicians/:id/promise — add promise (admin) */
router.post('/:id/promise', authenticate, requireAdmin, (req, res) => {
  const { title, status='pend', category } = req.body;
  if (!title || !category) return res.status(400).json({ error: 'title and category required' });
  if (!VALID_PROMISE_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  if (!db.prepare(`SELECT id FROM politicians WHERE id=?`).get(req.params.id)) {
    return res.status(404).json({ error: 'Politician not found' });
  }
  const result = db.prepare(`INSERT INTO promises (politician_id,title,status,category) VALUES (?,?,?,?)`)
    .run(req.params.id, title, status, category);
  audit(req, 'add_promise', 'promise', result.lastInsertRowid, null, { title, status });
  clearPoliticianCaches();
  res.json({ ok: true, id: result.lastInsertRowid });
});

module.exports = router;
