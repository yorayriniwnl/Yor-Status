const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireMod } = require('../middleware/auth');
const { cacheMiddleware } = require('../services/cache');

router.get('/:politician_id', cacheMiddleware(300), (req, res) => {
  const rows = db.prepare(`SELECT * FROM asset_declarations WHERE politician_id=? ORDER BY election_year DESC`).all(req.params.politician_id);
  if (!rows.length) return res.json({ data: [], growth: null });
  const growth = rows.length > 1 ? {
    absolute: rows[0].net_worth - rows[rows.length-1].net_worth,
    pct: rows[rows.length-1].net_worth > 0 ? ((rows[0].net_worth - rows[rows.length-1].net_worth) / rows[rows.length-1].net_worth * 100).toFixed(1) : null,
    years: rows[0].election_year - rows[rows.length-1].election_year
  } : null;
  const parsed = rows.map(r => ({ ...r, properties_json: JSON.parse(r.properties_json||'[]') }));
  res.json({ data: parsed, growth });
});

router.get('/', cacheMiddleware(120), (req, res) => {
  const richest = db.prepare(`
    SELECT p.name, p.party, p.twitter, p.initials, p.tab, ad.election_year, ad.net_worth
    FROM asset_declarations ad JOIN politicians p ON p.id=ad.politician_id
    WHERE ad.election_year=(SELECT MAX(election_year) FROM asset_declarations ad2 WHERE ad2.politician_id=ad.politician_id)
    ORDER BY ad.net_worth DESC LIMIT 20
  `).all();
  res.json({ richest });
});

router.post('/', authenticate, requireMod, (req, res) => {
  const { politician_id, election_year, movable_assets=0, immovable_assets=0, liabilities=0, cash_in_hand=0, bank_deposits=0, investments=0, vehicles_value=0, properties_json='[]', source_url, affidavit_url } = req.body;
  if (!politician_id || !election_year) return res.status(400).json({ error: 'politician_id and election_year required' });
  const net_worth = (parseFloat(movable_assets)||0) + (parseFloat(immovable_assets)||0) - (parseFloat(liabilities)||0);
  const result = db.prepare(`
    INSERT OR REPLACE INTO asset_declarations (politician_id,election_year,movable_assets,immovable_assets,liabilities,net_worth,cash_in_hand,bank_deposits,investments,vehicles_value,properties_json,source_url,affidavit_url)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(politician_id, election_year, movable_assets, immovable_assets, liabilities, net_worth, cash_in_hand, bank_deposits, investments, vehicles_value, typeof properties_json === 'string' ? properties_json : JSON.stringify(properties_json), source_url||null, affidavit_url||null);
  res.json({ ok: true, id: result.lastInsertRowid, net_worth });
});

module.exports = router;
