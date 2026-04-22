const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireMod } = require('../middleware/auth');
const { cacheMiddleware } = require('../services/cache');

const VERDICTS = ['true','mostly_true','half_true','mostly_false','false','unverifiable'];
const VERDICT_COLORS = { true:'#00FF87', mostly_true:'#4ADE80', half_true:'#FFD700', mostly_false:'#FB923C', false:'#FF4466', unverifiable:'#6B7A8D' };

router.get('/:politician_id', cacheMiddleware(120), (req, res) => {
  const rows = db.prepare(`SELECT * FROM fact_checks WHERE politician_id=? ORDER BY checked_date DESC`).all(req.params.politician_id);
  const summary = VERDICTS.map(v => ({ verdict:v, count: rows.filter(r=>r.verdict===v).length, color: VERDICT_COLORS[v] }));
  res.json({ data: rows, summary });
});

router.get('/', cacheMiddleware(120), (req, res) => {
  const { verdict } = req.query;
  let sql = `SELECT fc.*, p.name AS pol_name, p.party FROM fact_checks fc JOIN politicians p ON p.id=fc.politician_id WHERE 1=1`;
  const params = [];
  if (verdict && VERDICTS.includes(verdict)) { sql += ` AND fc.verdict=?`; params.push(verdict); }
  sql += ` ORDER BY fc.checked_date DESC LIMIT 30`;
  res.json({ data: db.prepare(sql).all(...params) });
});

router.post('/', authenticate, requireMod, (req, res) => {
  const { politician_id, claim_text, verdict, explanation, source_url, checked_by, checked_date } = req.body;
  if (!politician_id || !claim_text || !verdict) return res.status(400).json({ error: 'Missing required fields' });
  if (!VERDICTS.includes(verdict)) return res.status(400).json({ error: 'Invalid verdict' });
  const result = db.prepare(`INSERT INTO fact_checks (politician_id,claim_text,verdict,explanation,source_url,checked_by,checked_date) VALUES (?,?,?,?,?,?,?)`).run(politician_id, claim_text, verdict, explanation||null, source_url||null, checked_by||req.user.username, checked_date || new Date().toISOString().slice(0,10));
  res.json({ ok: true, id: result.lastInsertRowid });
});

router.patch('/:id', authenticate, requireMod, (req, res) => {
  const { verdict, explanation } = req.body;
  if (verdict && !VERDICTS.includes(verdict)) return res.status(400).json({ error: 'Invalid verdict' });
  const updates=[], vals=[];
  if (verdict) { updates.push('verdict=?'); vals.push(verdict); }
  if (explanation) { updates.push('explanation=?'); vals.push(explanation); }
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
  vals.push(req.params.id);
  db.prepare(`UPDATE fact_checks SET ${updates.join(',')} WHERE id=?`).run(...vals);
  res.json({ ok: true });
});

module.exports = router;
