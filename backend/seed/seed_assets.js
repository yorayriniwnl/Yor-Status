require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
process.chdir(require('path').join(__dirname, '..'));
const db = require('../db');

/* ── ASSET DECLARATIONS ── */
const ASSETS = [
  { name:"Narendra Modi",       year:2024, mov:3.2,  immov:1.1,  liab:0,    cash:0.1,  bank:2.2,  invest:0.8,  veh:0.08 },
  { name:"Rahul Gandhi",        year:2024, mov:15.8, immov:6.2,  liab:0,    cash:0.5,  bank:9.0,  invest:5.8,  veh:0.5 },
  { name:"Amit Shah",           year:2024, mov:35.0, immov:12.0, liab:0,    cash:2.0,  bank:15.0, invest:18.0, veh:0.8 },
  { name:"Nirmala Sitharaman",  year:2024, mov:1.8,  immov:0.9,  liab:0.2,  cash:0.05, bank:1.2,  invest:0.5,  veh:0.15},
  { name:"Yogi Adityanath",     year:2024, mov:1.4,  immov:0,    liab:0,    cash:0.5,  bank:0.9,  invest:0,    veh:0 },
  { name:"Mamata Banerjee",     year:2024, mov:1.2,  immov:0.8,  liab:0,    cash:0.1,  bank:0.6,  invest:0.5,  veh:0.15},
  { name:"N. Chandrababu Naidu",year:2024, mov:142,  immov:98,   liab:5,    cash:10,   bank:80,   invest:50,   veh:2 },
  { name:"Tejashwi Yadav",      year:2024, mov:8.5,  immov:4.2,  liab:0.5,  cash:0.8,  bank:4.5,  invest:3.2,  veh:0.5 },
  { name:"Arvind Kejriwal",     year:2024, mov:3.4,  immov:7.5,  liab:0,    cash:0.2,  bank:2.8,  invest:0.6,  veh:0.4 },
  { name:"M.K. Stalin",         year:2024, mov:12.5, immov:8.0,  liab:0,    cash:1.5,  bank:7.0,  invest:4.0,  veh:0.8 },
];

const insertAsset = db.prepare(`INSERT INTO asset_declarations (politician_id,election_year,movable_assets,immovable_assets,liabilities,net_worth,cash_in_hand,bank_deposits,investments,vehicles_value) VALUES (?,?,?,?,?,?,?,?,?,?)`);
const seedAssets = db.transaction(() => {
  db.exec(`
    DELETE FROM asset_declarations;
    DELETE FROM sqlite_sequence WHERE name = 'asset_declarations';
  `);
  let cnt = 0;
  for (const a of ASSETS) {
    const pol = db.prepare(`SELECT id FROM politicians WHERE name=?`).get(a.name);
    if (!pol) continue;
    const net = a.mov + a.immov - a.liab;
    insertAsset.run(pol.id, a.year, a.mov, a.immov, a.liab, net, a.cash, a.bank, a.invest, a.veh);
    cnt++;
  }
  console.log(`✓ Assets: ${cnt} declarations seeded`);
});
seedAssets();
