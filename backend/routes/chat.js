const express = require('express');
const fetch = require('node-fetch');

const db = require('../db');

const router = express.Router();

function buildContext() {
  const polSummary = db.prepare(`
    SELECT p.id, p.name, p.party, p.tab, p.state,
      SUM(CASE WHEN pr.status='done' THEN 1 ELSE 0 END) as done,
      SUM(CASE WHEN pr.status='prog' THEN 1 ELSE 0 END) as prog,
      SUM(CASE WHEN pr.status='pend' THEN 1 ELSE 0 END) as pend,
      SUM(CASE WHEN pr.status='brok' THEN 1 ELSE 0 END) as brok,
      ROUND(AVG(r.stars), 2) as avg_rating,
      COUNT(DISTINCT lc.id) as total_charges,
      SUM(CASE WHEN lc.status='active' THEN 1 ELSE 0 END) as active_charges
    FROM politicians p
    LEFT JOIN promises pr ON pr.politician_id = p.id
    LEFT JOIN ratings r ON r.politician_id = p.id
    LEFT JOIN legal_charges lc ON lc.politician_id = p.id
    GROUP BY p.id
  `).all();

  const stateSummary = db.prepare(`
    SELECT name, cm_name, party, gdp_growth, rank_gdp,
      score_infra, score_welfare, score_economy, score_govn, score_env
    FROM states
    ORDER BY gdp_growth DESC
  `).all();

  const legalSummary = db.prepare(`
    SELECT COUNT(*) as total,
      SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN status='convicted' THEN 1 ELSE 0 END) as convicted
    FROM legal_charges
  `).get();

  const promiseSummary = db.prepare(`
    SELECT status, COUNT(*) as c
    FROM promises
    GROUP BY status
  `).all();

  const topRated = db.prepare(`
    SELECT p.name, p.party, ROUND(AVG(r.stars), 2) as avg_rating
    FROM politicians p
    JOIN ratings r ON r.politician_id = p.id
    GROUP BY p.id
    HAVING COUNT(r.id) > 0
    ORDER BY avg_rating DESC, COUNT(r.id) DESC
    LIMIT 3
  `).all();

  return { legalSummary, polSummary, promiseSummary, stateSummary, topRated };
}

function buildSystemPrompt(context) {
  const promiseMap = {};
  context.promiseSummary.forEach((item) => {
    promiseMap[item.status] = item.c;
  });

  return `You are Yor Votes AI - India's political accountability assistant. You have access to live data from the app database.

LIVE DATA (${new Date().toLocaleDateString('en-IN')}):
Promise Statistics: Done=${promiseMap.done || 0} | In Progress=${promiseMap.prog || 0} | Pending=${promiseMap.pend || 0} | Broken=${promiseMap.brok || 0}
Legal Records: ${context.legalSummary.total} total charges | ${context.legalSummary.active} active | ${context.legalSummary.convicted} convicted

PM & Cabinet: ${context.polSummary.filter((item) => item.tab === 'pm').map((item) => `${item.name}(${item.party}): ${item.done} done/${item.brok} broken`).join(', ')}
Chief Ministers: ${context.polSummary.filter((item) => item.tab === 'cm').map((item) => `${item.name}(${item.state},${item.party}): ${item.done} done/${item.brok} broken`).join(', ')}
Top States by GDP: ${context.stateSummary.slice(0, 8).map((item) => `${item.name}:${item.gdp_growth}%(${item.party})`).join(', ')}

GUIDELINES:
- Be factual and evidence-based; cite specific numbers from the data
- Stay politically neutral
- Keep responses concise unless the user asks for depth
- If the database does not contain an answer, say so honestly`;
}

function buildFallbackReply(messages, context) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content || '';
  const query = latestUserMessage.toLowerCase();

  const politician = context.polSummary.find((item) => query.includes(item.name.toLowerCase()));
  if (politician) {
    const ratingText = politician.avg_rating ? `${politician.avg_rating}/5` : 'not yet rated';
    return `${politician.name} is tracked as a ${politician.party} leader for ${politician.state}. In the database, they have ${politician.done || 0} promises marked done, ${politician.prog || 0} in progress, ${politician.pend || 0} pending, and ${politician.brok || 0} broken. Their current public rating is ${ratingText}. They also have ${politician.active_charges || 0} active legal charges out of ${politician.total_charges || 0} total recorded charges.`;
  }

  const state = context.stateSummary.find((item) => query.includes(item.name.toLowerCase()));
  if (state) {
    const avgScore = Math.round(((state.score_infra || 0) + (state.score_welfare || 0) + (state.score_economy || 0) + (state.score_govn || 0) + (state.score_env || 0)) / 5);
    return `${state.name} is ranked #${state.rank_gdp} by GDP growth at ${state.gdp_growth}%, and is led by ${state.cm_name} of ${state.party}. Its average long-term impact score in the database is ${avgScore}/100. The strongest tracked scores are welfare ${state.score_welfare || 0}, economy ${state.score_economy || 0}, and governance ${state.score_govn || 0}. Ask me if you want a comparison with another state.`;
  }

  if (query.includes('gdp') || query.includes('top state') || query.includes('best state')) {
    const topStates = context.stateSummary
      .slice(0, 5)
      .map((item) => `${item.rank_gdp}. ${item.name} (${item.gdp_growth}%)`)
      .join(', ');
    return `The current top GDP-growth states in the dataset are ${topStates}. These rankings come from the same state tracker data the frontend uses. If you want a welfare- or HDI-oriented comparison instead, ask for that directly.`;
  }

  if (query.includes('legal') || query.includes('charge') || query.includes('case')) {
    const mostCharged = [...context.polSummary]
      .sort((left, right) => (right.total_charges || 0) - (left.total_charges || 0))
      .slice(0, 3)
      .map((item) => `${item.name} (${item.total_charges || 0} total, ${item.active_charges || 0} active)`)
      .join(', ');
    return `The database currently tracks ${context.legalSummary.total} legal charges, with ${context.legalSummary.active} active and ${context.legalSummary.convicted} convicted. The most charged politicians right now are ${mostCharged}. If you name a specific politician, I can narrow the legal summary further.`;
  }

  const promiseMap = {};
  context.promiseSummary.forEach((item) => {
    promiseMap[item.status] = item.c;
  });

  const topRatedSummary = context.topRated.length
    ? context.topRated.map((item) => `${item.name} (${item.avg_rating}/5)`).join(', ')
    : 'no public ratings yet';

  return `Yor Votes currently tracks ${context.polSummary.length} politicians, ${promiseMap.done || 0} kept promises, ${promiseMap.prog || 0} promises in progress, ${promiseMap.pend || 0} pending promises, and ${promiseMap.brok || 0} broken promises. The platform also includes ${context.legalSummary.total} legal records and a full state GDP tracker. Top currently rated politicians are ${topRatedSummary}. Ask about a politician, party, state, GDP ranking, or legal record for a more specific answer.`;
}

router.post('/', async (req, res) => {
  const { messages } = req.body;
  if (!messages?.length) return res.status(400).json({ error: 'messages required' });

  const context = buildContext();
  const fallbackReply = buildFallbackReply(messages, context);

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.json({ provider: 'local', reply: fallbackReply });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 700,
        system: buildSystemPrompt(context),
        messages: messages.slice(-12),
      }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      console.error('Chat provider error:', errorPayload.error?.message || response.statusText);
      return res.json({ provider: 'local', reply: fallbackReply });
    }

    const data = await response.json();
    const reply = data.content?.map((item) => item.text || '').join('') || fallbackReply;
    return res.json({ provider: 'anthropic', reply });
  } catch (error) {
    console.error('Chat error:', error);
    return res.json({ provider: 'local', reply: fallbackReply });
  }
});

module.exports = router;
