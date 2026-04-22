const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireMod, requireAdmin, audit } = require('../middleware/auth');
const { cacheMiddleware, del } = require('../services/cache');
const { notifyWatchers } = require('../services/notifications');

const STATUSES   = ['active','pending','false','convicted','acquitted','settled','stayed'];
const SEVERITIES = ['minor','moderate','serious','severe'];

function summary(rows) {
  const s={};
  const byCat={};
  rows.forEach(r=>{
    s[r.status]=(s[r.status]||0)+1;
    byCat[r.category]=byCat[r.category]||{category:r.category,total:0,active:0,pending:0,false:0,acquitted:0,convicted:0,settled:0,stayed:0};
    byCat[r.category].total++;
    byCat[r.category][r.status]=(byCat[r.category][r.status]||0)+1;
  });
  return { statusSummary:s, byCat:Object.values(byCat) };
}

router.get('/', cacheMiddleware(60), (req, res) => {
  const { status, category, severity, politician_id, search } = req.query;
  let sql = `SELECT lc.*, p.name AS politician_name, p.party, p.twitter, p.initials, p.tab
    FROM legal_charges lc JOIN politicians p ON p.id=lc.politician_id WHERE 1=1`;
  const params = [];
  if (status)       { sql+=` AND lc.status=?`;        params.push(status); }
  if (category)     { sql+=` AND lc.category=?`;      params.push(category); }
  if (severity)     { sql+=` AND lc.severity=?`;      params.push(severity); }
  if (politician_id){ sql+=` AND lc.politician_id=?`; params.push(politician_id); }
  if (search)       { sql+=` AND (lc.title LIKE ? OR lc.description LIKE ? OR p.name LIKE ?)`; const q=`%${search}%`; params.push(q,q,q); }
  sql += ` ORDER BY CASE lc.status WHEN 'convicted' THEN 1 WHEN 'active' THEN 2 WHEN 'pending' THEN 3 ELSE 5 END, lc.date_filed DESC`;
  const rows = db.prepare(sql).all(...params);
  res.json({ data:rows, total:rows.length, ...summary(rows) });
});

router.get('/meta/stats', cacheMiddleware(120), (req, res) => {
  const byParty = db.prepare(`
    SELECT p.party, COUNT(*) as total,
      SUM(CASE WHEN lc.status='active' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN lc.status='convicted' THEN 1 ELSE 0 END) as convicted,
      SUM(CASE WHEN lc.status IN ('false','acquitted') THEN 1 ELSE 0 END) as cleared
    FROM legal_charges lc JOIN politicians p ON p.id=lc.politician_id
    GROUP BY p.party ORDER BY total DESC
  `).all();
  const mostCharged = db.prepare(`
    SELECT p.name,p.party,p.twitter,p.initials,p.tab,
      COUNT(*) as total_charges,
      SUM(CASE WHEN lc.status='active' THEN 1 ELSE 0 END) as active_charges,
      SUM(CASE WHEN lc.severity='severe' THEN 1 ELSE 0 END) as severe_charges
    FROM legal_charges lc JOIN politicians p ON p.id=lc.politician_id
    GROUP BY p.id ORDER BY total_charges DESC LIMIT 10
  `).all();
  const bySeverity = db.prepare(`SELECT severity, COUNT(*) as count FROM legal_charges WHERE severity IS NOT NULL GROUP BY severity`).all();
  const byStatus   = db.prepare(`SELECT status, COUNT(*) as count FROM legal_charges GROUP BY status ORDER BY count DESC`).all();
  const byCategory = db.prepare(`SELECT category, COUNT(*) as total, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active FROM legal_charges GROUP BY category ORDER BY total DESC`).all();
  res.json({ byParty, mostCharged, bySeverity, byStatus, byCategory, total: db.prepare(`SELECT COUNT(*) as c FROM legal_charges`).get().c });
});

router.get('/meta/categories', cacheMiddleware(300), (req, res) => {
  res.json({
    categories: db.prepare(`SELECT DISTINCT category FROM legal_charges ORDER BY category`).all().map(r=>r.category),
    statuses: STATUSES, severities: SEVERITIES
  });
});

router.get('/:politician_id', cacheMiddleware(60), (req, res) => {
  const rows = db.prepare(`SELECT * FROM legal_charges WHERE politician_id=? ORDER BY CASE status WHEN 'convicted' THEN 1 WHEN 'active' THEN 2 WHEN 'pending' THEN 3 ELSE 5 END, date_filed DESC`).all(req.params.politician_id);
  res.json({ data:rows, ...summary(rows) });
});

router.post('/', authenticate, requireMod, (req, res) => {
  const { politician_id, category, status, title, description, case_number, court, filing_agency, date_filed, date_updated, severity, outcome, source_url } = req.body;
  if (!politician_id || !category || !status || !title) return res.status(400).json({ error: 'Missing required fields' });
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const result = db.prepare(`INSERT INTO legal_charges (politician_id,category,status,title,description,case_number,court,filing_agency,date_filed,date_updated,severity,outcome,source_url,added_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(politician_id, category, status, title, description||null, case_number||null, court||null, filing_agency||null, date_filed||null, date_updated||null, severity||null, outcome||null, source_url||null, req.user.id);
  audit(req, 'add_legal', 'legal_charge', result.lastInsertRowid, null, {title,status});
  del('cache:/api/legal*');
  // Notify watchers of the politician
  const pol = db.prepare(`SELECT name FROM politicians WHERE id=?`).get(politician_id);
  notifyWatchers(politician_id, 'legal_update', `New legal charge — ${pol?.name}`, title);
  res.json({ ok:true, id:result.lastInsertRowid });
});

router.patch('/:id', authenticate, requireMod, (req, res) => {
  const { status, outcome, date_updated, severity } = req.body;
  if (status && !STATUSES.includes(status)) return res.status(400).json({ error:'Invalid status' });
  const old = db.prepare(`SELECT * FROM legal_charges WHERE id=?`).get(req.params.id);
  const updates=[], vals=[];
  if (status)       { updates.push('status=?');       vals.push(status); }
  if (outcome)      { updates.push('outcome=?');      vals.push(outcome); }
  if (date_updated) { updates.push('date_updated=?'); vals.push(date_updated); }
  if (severity)     { updates.push('severity=?');     vals.push(severity); }
  if (!updates.length) return res.status(400).json({ error:'Nothing to update' });
  updates.push('updated_at=CURRENT_TIMESTAMP'); vals.push(req.params.id);
  db.prepare(`UPDATE legal_charges SET ${updates.join(',')} WHERE id=?`).run(...vals);
  audit(req, 'update_legal', 'legal_charge', req.params.id, old, req.body);
  if (old && status && old.status !== status) {
    notifyWatchers(old.politician_id, 'legal_update', `Case status changed`, `"${old.title}": ${old.status} → ${status}`);
  }
  del('cache:/api/legal*');
  res.json({ ok:true });
});

router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const old = db.prepare(`SELECT * FROM legal_charges WHERE id=?`).get(req.params.id);
  db.prepare(`DELETE FROM legal_charges WHERE id=?`).run(req.params.id);
  audit(req, 'delete_legal', 'legal_charge', req.params.id, old);
  del('cache:/api/legal*');
  res.json({ ok:true });
});

module.exports = router;
