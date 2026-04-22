const express = require('express');
const router  = express.Router();
const fetch   = require('node-fetch');
const db      = require('../db');

router.post('/', async (req, res) => {
  const { messages } = req.body;
  if (!messages?.length) return res.status(400).json({ error: 'messages required' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  // Live DB context
  const polSummary = db.prepare(`
    SELECT p.name,p.party,p.tab,p.state,
      SUM(CASE WHEN pr.status='done' THEN 1 ELSE 0 END) as done,
      SUM(CASE WHEN pr.status='brok' THEN 1 ELSE 0 END) as brok
    FROM politicians p LEFT JOIN promises pr ON pr.politician_id=p.id GROUP BY p.id
  `).all();
  const stateSummary  = db.prepare(`SELECT name,party,gdp_growth,rank_gdp FROM states ORDER BY gdp_growth DESC`).all();
  const legalSummary  = db.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active, SUM(CASE WHEN status='convicted' THEN 1 ELSE 0 END) as convicted FROM legal_charges`).get();
  const promiseSummary= db.prepare(`SELECT status, COUNT(*) as c FROM promises GROUP BY status`).all();
  const pMap = {};
  promiseSummary.forEach(p=>{ pMap[p.status]=p.c; });

  const system = `You are YorStatus AI — India's most advanced political accountability assistant. You have access to live data from a comprehensive database.

LIVE DATA (${new Date().toLocaleDateString('en-IN')}):
Promise Statistics: Done=${pMap.done||0} | In Progress=${pMap.prog||0} | Pending=${pMap.pend||0} | Broken=${pMap.brok||0}
Legal Records: ${legalSummary.total} total charges | ${legalSummary.active} active | ${legalSummary.convicted} convicted

PM & Cabinet: ${polSummary.filter(p=>p.tab==='pm').map(p=>`${p.name}(${p.party}): ${p.done}✓/${p.brok}✗`).join(', ')}
Chief Ministers: ${polSummary.filter(p=>p.tab==='cm').map(p=>`${p.name}(${p.state},${p.party}): ${p.done}✓/${p.brok}✗`).join(', ')}
Top States by GDP: ${stateSummary.slice(0,8).map(s=>`${s.name}:${s.gdp_growth}%(${s.party})`).join(', ')}

GUIDELINES:
- Be factual and evidence-based; cite specific numbers from the data
- Non-partisan; present facts without political bias
- Cite court case numbers or affidavit sources when discussing legal matters
- Encourage civic engagement and democratic accountability
- Keep responses concise (4-6 sentences) unless asked for detail
- If asked about something not in the database, say so honestly`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:700, system, messages: messages.slice(-12) })
    });
    if (!response.ok) { const e = await response.json(); return res.status(response.status).json({ error: e.error?.message }); }
    const data  = await response.json();
    const reply = data.content?.map(c=>c.text||'').join('') || 'No response.';
    res.json({ reply });
  } catch(e) {
    console.error('Chat error:', e);
    res.status(500).json({ error: 'Failed to reach AI service' });
  }
});

module.exports = router;
