const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireMod } = require('../middleware/auth');
const { cacheMiddleware, del } = require('../services/cache');

function safeJsonArray(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function clearAssetCaches() {
  del('cache:/api/assets*');
  del('cache:/api/politicians*');
}

router.get('/:politician_id', cacheMiddleware(300), (req, res) => {
  const rows = db.prepare(`SELECT * FROM asset_declarations WHERE politician_id=? ORDER BY election_year DESC`).all(req.params.politician_id);
  if (!rows.length) return res.json({ data: [], growth: null });
  const growth = rows.length > 1 ? {
    absolute: rows[0].net_worth - rows[rows.length-1].net_worth,
    pct: rows[rows.length-1].net_worth > 0 ? ((rows[0].net_worth - rows[rows.length-1].net_worth) / rows[rows.length-1].net_worth * 100).toFixed(1) : null,
    years: rows[0].election_year - rows[rows.length-1].election_year
  } : null;
  const parsed = rows.map(r => ({ ...r, properties_json: safeJsonArray(r.properties_json) }));
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
  if (!db.prepare(`SELECT id FROM politicians WHERE id=?`).get(politician_id)) return res.status(404).json({ error: 'Politician not found' });

  const year = parseInt(election_year, 10);
  if (!Number.isInteger(year) || year < 1950 || year > 2100) return res.status(400).json({ error: 'Invalid election_year' });

  const movable = parseFloat(movable_assets) || 0;
  const immovable = parseFloat(immovable_assets) || 0;
  const liability = parseFloat(liabilities) || 0;
  const cash = parseFloat(cash_in_hand) || 0;
  const deposits = parseFloat(bank_deposits) || 0;
  const investmentValue = parseFloat(investments) || 0;
  const vehicles = parseFloat(vehicles_value) || 0;
  const net_worth = movable + immovable - liability;
  const properties = typeof properties_json === 'string' ? JSON.stringify(safeJsonArray(properties_json)) : JSON.stringify(Array.isArray(properties_json) ? properties_json : []);

  const existing = db.prepare(`SELECT id FROM asset_declarations WHERE politician_id=? AND election_year=?`).get(politician_id, year);
  let id = existing?.id;
  if (existing) {
    db.prepare(`
      UPDATE asset_declarations
      SET movable_assets=?, immovable_assets=?, liabilities=?, net_worth=?, cash_in_hand=?, bank_deposits=?,
          investments=?, vehicles_value=?, properties_json=?, source_url=?, affidavit_url=?
      WHERE id=?
    `).run(movable, immovable, liability, net_worth, cash, deposits, investmentValue, vehicles, properties, source_url||null, affidavit_url||null, id);
  } else {
    const result = db.prepare(`
      INSERT INTO asset_declarations (politician_id,election_year,movable_assets,immovable_assets,liabilities,net_worth,cash_in_hand,bank_deposits,investments,vehicles_value,properties_json,source_url,affidavit_url)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(politician_id, year, movable, immovable, liability, net_worth, cash, deposits, investmentValue, vehicles, properties, source_url||null, affidavit_url||null);
    id = result.lastInsertRowid;
  }

  clearAssetCaches();
  res.json({ ok: true, id, net_worth });
});

module.exports = router;
