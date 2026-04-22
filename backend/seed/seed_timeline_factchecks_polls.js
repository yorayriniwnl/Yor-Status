require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
process.chdir(require('path').join(__dirname, '..'));
const db = require('../db');

/* ── TIMELINE EVENTS ── */
const TIMELINE = [
  { name:"Narendra Modi", events:[
    { date:"2024-06-09", title:"Sworn in as PM for 3rd consecutive term", type:"appointment", desc:"Modi took oath as PM after NDA won 293 seats in 18th Lok Sabha elections." },
    { date:"2024-01-22", title:"Ram Temple consecration — Prana Pratishtha", type:"achievement", desc:"Modi performed the consecration ceremony at the Ram Mandir in Ayodhya, fulfilling a 30-year BJP promise." },
    { date:"2021-05-01", title:"COVID second wave — oxygen crisis", type:"scandal", desc:"India faced devastating second wave with severe shortage of oxygen and hospital beds. Critics blamed government unpreparedness." },
    { date:"2019-08-05", title:"Article 370 abrogation — J&K bifurcation", type:"policy", desc:"Modi government abrogated Article 370, bifurcating J&K into two Union Territories." },
  ]},
  { name:"Arvind Kejriwal", events:[
    { date:"2024-09-13", title:"Released on bail in liquor policy case", type:"acquittal", desc:"Supreme Court granted regular bail to Kejriwal in the Delhi excise policy money laundering case." },
    { date:"2024-03-21", title:"Arrested by ED in liquor policy case", type:"arrest", desc:"Enforcement Directorate arrested Kejriwal making him the first sitting CM to be arrested." },
    { date:"2022-03-10", title:"AAP sweeps Punjab — wins 92/117 seats", type:"election", desc:"Aam Aadmi Party won a landslide in Punjab assembly elections, expanding beyond Delhi." },
  ]},
  { name:"Rahul Gandhi", events:[
    { date:"2024-06-24", title:"Elected Leader of Opposition, Lok Sabha", type:"appointment", desc:"Rahul Gandhi assumed office as Leader of Opposition — the first LoP in Lok Sabha since 2014." },
    { date:"2023-03-23", title:"Convicted in defamation case; LS disqualified", type:"scandal", desc:"Convicted by Surat CJM in Modi surname defamation case. Lok Sabha membership disqualified." },
    { date:"2022-09-30", title:"Bharat Jodo Yatra begins — Kanyakumari to Kashmir", type:"achievement", desc:"Gandhi led 3,570 km padyatra covering 12 states over 150 days, boosting Congress ground connect." },
  ]},
  { name:"Yogi Adityanath", events:[
    { date:"2024-01-22", title:"Presided over Ayodhya Ram Temple consecration", type:"achievement", desc:"As UP CM, Adityanath co-led the Prana Pratishtha ceremony alongside PM Modi at Ram Mandir." },
    { date:"2022-03-25", title:"Re-elected as UP CM with historic BJP majority", type:"election", desc:"BJP won 255/403 seats — UP's first back-to-back full majority since 1985." },
    { date:"2021-04-14", title:"Kumbh held mid-COVID — superspreader allegations", type:"scandal", desc:"Critics alleged Kumbh Mela was a COVID superspreader event as second wave raged." },
  ]},
  { name:"Mamata Banerjee", events:[
    { date:"2021-05-05", title:"Third consecutive term as WB CM", type:"election", desc:"TMC won 213/294 seats despite enormous BJP challenge and central deployments." },
    { date:"2021-05-03", title:"Post-poll violence — NHRC probe ordered", type:"scandal", desc:"Post-election violence reported across WB. NHRC committee documented 35+ deaths." },
  ]},
  { name:"Hemant Soren", events:[
    { date:"2024-11-28", title:"Re-elected as Jharkhand CM after bail", type:"election", desc:"JMM-INC alliance won 56/81 seats despite Soren's arrest, demonstrating strong voter support." },
    { date:"2024-07-28", title:"Granted bail by Jharkhand HC", type:"acquittal", desc:"High Court granted bail after 5+ months of detention in ED land scam case." },
    { date:"2024-01-31", title:"Arrested by ED in land scam", type:"arrest", desc:"ED arrested Soren in Rs 1,000 crore alleged land acquisition scam." },
  ]},
];

const insertEvent = db.prepare(`INSERT INTO timeline_events (politician_id,event_date,title,description,type) VALUES (?,?,?,?,?)`);
const seedTimeline = db.transaction(() => {
  db.exec(`
    DELETE FROM timeline_events;
    DELETE FROM sqlite_sequence WHERE name = 'timeline_events';
  `);
  let cnt = 0;
  for (const entry of TIMELINE) {
    const pol = db.prepare(`SELECT id FROM politicians WHERE name=?`).get(entry.name);
    if (!pol) continue;
    for (const e of entry.events) { insertEvent.run(pol.id, e.date, e.title, e.desc||null, e.type); cnt++; }
  }
  console.log(`✓ Timeline: ${cnt} events seeded`);
});
seedTimeline();

/* ── FACT CHECKS ── */
const FACTCHECKS = [
  { name:"Narendra Modi", claim:"India built 100 smart cities under Smart Cities Mission", verdict:"half_true", explanation:"143 cities were selected but completion rates vary widely. Many projects remain incomplete past deadlines.", checked_by:"FactChecker.in", date:"2024-08-01" },
  { name:"Narendra Modi", claim:"Modi deposited Rs 15 lakh in every account", verdict:"false", explanation:"PM Modi himself clarified in a 2016 interview this was a political speech, not a literal promise. The Supreme Court called it a 'jumla' (political statement).", checked_by:"AltNews", date:"2023-01-15" },
  { name:"Arvind Kejriwal", claim:"Yamuna will be clean by 2025", verdict:"false", explanation:"Delhi Jal Board data shows Yamuna BOD and ammonia levels remain critically above safe limits as of 2024.", checked_by:"India Today Fact Check", date:"2024-11-01" },
  { name:"Yogi Adityanath", claim:"UP became 2nd largest economy in India under BJP", verdict:"mostly_true", explanation:"UP GSDP has doubled and it has moved from 5th to 2nd largest state economy by nominal GSDP, though HDI and poverty rankings remain concerning.", checked_by:"Mint", date:"2024-09-20" },
  { name:"Rahul Gandhi", claim:"India has 40% unemployment among youth", verdict:"mostly_false", explanation:"CMIE data shows youth unemployment at 19-23%, not 40%. The 40% figure conflates underemployment and informal employment.", checked_by:"FactChecker.in", date:"2024-04-10" },
  { name:"Mamata Banerjee", claim:"West Bengal has zero political violence since TMC won", verdict:"false", explanation:"NHRC documented 35+ political deaths post 2021 elections. Multiple FIRs and court cases are active.", checked_by:"The Wire", date:"2022-09-15" },
];

const insertFC = db.prepare(`INSERT INTO fact_checks (politician_id,claim_text,verdict,explanation,checked_by,checked_date) VALUES (?,?,?,?,?,?)`);
const seedFC = db.transaction(() => {
  db.exec(`
    DELETE FROM fact_checks;
    DELETE FROM sqlite_sequence WHERE name = 'fact_checks';
  `);
  let cnt = 0;
  for (const fc of FACTCHECKS) {
    const pol = db.prepare(`SELECT id FROM politicians WHERE name=?`).get(fc.name);
    if (!pol) continue;
    insertFC.run(pol.id, fc.claim, fc.verdict, fc.explanation, fc.checked_by, fc.date);
    cnt++;
  }
  console.log(`✓ Fact checks: ${cnt} seeded`);
});
seedFC();

/* ── POLLS ── */
const POLLS = [
  { pol_name:"Narendra Modi", title:"How would you rate Modi's 3rd term so far?", options:["Excellent — exceeding expectations","Good — on the right track","Average — mixed results","Poor — major disappointments","Too early to judge"] },
  { pol_name:"Arvind Kejriwal", title:"Should Kejriwal have resigned after his arrest?", options:["Yes — should have resigned immediately","Yes — but after bail was right","No — it was political vendetta","No opinion"] },
  { pol_name:"Yogi Adityanath", title:"How safe has UP become under Yogi?", options:["Much safer than before","Somewhat safer","About the same","More dangerous for minorities","Data is manipulated"] },
  { pol_name:"Mamata Banerjee", title:"Will TMC win a 4th term in 2026?", options:["Yes, easily","Yes, but narrowly","No, BJP will win","No, Congress-Left will surprise"] },
  { pol_name:null, title:"Which party has the best track record on promises?", options:["BJP","INC (Congress)","AAP","DMK","TMC","Other regional parties"] },
];

const insertPoll = db.prepare(`INSERT INTO polls (title, politician_id, created_by, is_active) VALUES (?,?,?,1)`);
const insertOpt  = db.prepare(`INSERT INTO poll_options (poll_id, text) VALUES (?,?)`);
const seedPolls = db.transaction(() => {
  db.exec(`
    DELETE FROM poll_options;
    DELETE FROM poll_votes;
    DELETE FROM polls;
    DELETE FROM sqlite_sequence WHERE name IN ('poll_options', 'poll_votes', 'polls');
  `);
  let cnt = 0;
  for (const p of POLLS) {
    const pol = p.pol_name ? db.prepare(`SELECT id FROM politicians WHERE name=?`).get(p.pol_name) : null;
    const res = insertPoll.run(p.title, pol?.id||null, null);
    for (const o of p.options) insertOpt.run(res.lastInsertRowid, o);
    cnt++;
  }
  console.log(`✓ Polls: ${cnt} seeded`);
});
seedPolls();
