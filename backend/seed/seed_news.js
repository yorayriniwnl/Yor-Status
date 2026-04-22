require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
process.chdir(require('path').join(__dirname, '..'));
const db = require('../db');

const NEWS = [
  { headline:"PM Modi unveils Viksit Bharat 2047 roadmap at Red Fort", summary:"Prime Minister Modi outlined a comprehensive 23-year plan for transforming India into a developed nation by 2047 during Independence Day address. Key focus areas include manufacturing, green energy and digital infrastructure.", source_name:"The Hindu", source_url:"https://thehindu.com/sample1", politician:"Narendra Modi", sentiment:"positive", category:"Economy", published_at:"2024-08-15T10:00:00Z" },
  { headline:"Supreme Court stays Siddaramaiah prosecution in MUDA case", summary:"The Supreme Court of India stayed the Karnataka Governor's sanction to prosecute Chief Minister Siddaramaiah in the MUDA (Mysuru Urban Development Authority) site allotment case, giving major relief to the CM.", source_name:"Indian Express", source_url:"https://indianexpress.com/sample2", politician:"Siddaramaiah", sentiment:"positive", category:"Legal", published_at:"2024-10-05T11:30:00Z" },
  { headline:"Kejriwal gets regular bail in Delhi liquor case, returns as CM", summary:"The Supreme Court granted regular bail to AAP chief Arvind Kejriwal in the Delhi excise policy money laundering case. He resigned as Delhi CM and demanded snap elections after returning from Tihar jail.", source_name:"NDTV", source_url:"https://ndtv.com/sample3", politician:"Arvind Kejriwal", sentiment:"neutral", category:"Legal", published_at:"2024-09-13T09:00:00Z" },
  { headline:"Yogi government completes 6 expressways; UP economy doubles in 7 years", summary:"Uttar Pradesh Chief Minister Yogi Adityanath announced that UP's GSDP has doubled from Rs 14.89 lakh crore in 2017 to Rs 27+ lakh crore in 2024, with 6 expressways now operational across the state.", source_name:"Times of India", source_url:"https://toi.com/sample4", politician:"Yogi Adityanath", sentiment:"positive", category:"Economy", published_at:"2024-11-10T14:00:00Z" },
  { headline:"Hemant Soren gets bail, returns as Jharkhand CM after 5 months", summary:"JMM leader Hemant Soren was granted bail by the Jharkhand High Court in the land scam case after being arrested by the Enforcement Directorate in January 2024. He was reinstated as Chief Minister and won the November 2024 election.", source_name:"Hindustan Times", source_url:"https://ht.com/sample5", politician:"Hemant Soren", sentiment:"neutral", category:"Legal", published_at:"2024-07-28T16:00:00Z" },
  { headline:"India's GDP grows 8.2% in 2023-24; third consecutive year of 8%+ growth", summary:"India's GDP grew at 8.2% in FY2023-24, making it the fastest growing major economy globally. Finance Minister Nirmala Sitharaman attributed growth to infrastructure spending, digital transactions and manufacturing PLI schemes.", source_name:"Business Standard", source_url:"https://bstd.com/sample6", politician:"Nirmala Sitharaman", sentiment:"positive", category:"Economy", published_at:"2024-05-31T08:00:00Z" },
  { headline:"Tamil Nadu leads in EV investment; Ola, Hyundai set up mega plants", summary:"Chief Minister MK Stalin's industrial policy attracted Ola Electric, Hyundai and TVS to set up major EV manufacturing facilities in Tamil Nadu, potentially creating 50,000+ jobs.", source_name:"Economic Times", source_url:"https://et.com/sample7", politician:"M.K. Stalin", sentiment:"positive", category:"Industry", published_at:"2024-07-20T11:00:00Z" },
  { headline:"Delhi AQI hits severe for 15th consecutive day; Yamuna cleanup deadline missed", summary:"Delhi recorded hazardous air quality for the 15th day running as the CM-appointed panel admitted the Yamuna cleaning deadline was not met. Opposition BJP and AAP traded barbs over accountability.", source_name:"Times of India", source_url:"https://toi.com/sample8", politician:"Rekha Gupta", sentiment:"negative", category:"Environment", published_at:"2024-11-20T07:00:00Z" },
  { headline:"Mamata launches Lakshmir Bhandar 2.0; increases transfer to Rs 1500/month", summary:"West Bengal Chief Minister Mamata Banerjee announced an increase in the Lakshmir Bhandar monthly direct benefit transfer from Rs 1000 to Rs 1500 for all eligible women, ahead of the 2026 assembly elections.", source_name:"Anandabazar Patrika", source_url:"https://abp.com/sample9", politician:"Mamata Banerjee", sentiment:"positive", category:"Welfare", published_at:"2024-10-01T10:00:00Z" },
  { headline:"Rahul Gandhi's National Herald case: ED files chargesheet in PMLA court", summary:"The Enforcement Directorate filed a chargesheet in the Patiala House Courts against Congress leader Rahul Gandhi and Sonia Gandhi in the National Herald money laundering case involving alleged acquisition of Associated Journals assets.", source_name:"LiveMint", source_url:"https://livemint.com/sample10", politician:"Rahul Gandhi", sentiment:"negative", category:"Legal", published_at:"2024-04-05T09:30:00Z" },
  { headline:"Karnataka implements 5 guarantees; spends Rs 50,000 crore in first year", summary:"The Siddaramaiah government in Karnataka completed implementation of all five election guarantees — Shakti free bus passes, Anna Bhagya rice, Gruha Jyoti electricity, Gruha Lakshmi women's stipend, and Yuva Nidhi unemployment allowance — spending Rs 52,000 crore.", source_name:"Deccan Herald", source_url:"https://dh.com/sample11", politician:"Siddaramaiah", sentiment:"positive", category:"Welfare", published_at:"2024-05-20T14:00:00Z" },
  { headline:"Bihar gets new CM: Samrat Choudhary sworn in as BJP's first Bihar CM", summary:"Samrat Choudhary was sworn in as Bihar's first-ever BJP Chief Minister on April 15, 2026, after Nitish Kumar resigned following the NDA's assembly election victory where BJP emerged as the single largest party.", source_name:"Dainik Bhaskar", source_url:"https://db.com/sample12", politician:"Samrat Choudhary", sentiment:"neutral", category:"Politics", published_at:"2026-04-15T13:00:00Z" },
];

const insert = db.prepare(`INSERT INTO news_articles (headline,summary,source_name,source_url,politician_id,sentiment,category,published_at) VALUES (?,?,?,?,?,?,?,?)`);
let cnt = 0;
const newsAll = db.transaction(() => {
  db.exec(`
    DELETE FROM news_articles;
    DELETE FROM sqlite_sequence WHERE name = 'news_articles';
  `);
  for (const n of NEWS) {
    const pol = n.politician ? db.prepare(`SELECT id FROM politicians WHERE name=?`).get(n.politician) : null;
    insert.run(n.headline, n.summary, n.source_name, n.source_url, pol?.id||null, n.sentiment, n.category, n.published_at);
    cnt++;
  }
});
newsAll();
console.log(`✓ News: ${cnt} articles seeded`);
