const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { optionalAuth } = require('../middleware/auth');

router.get('/:politician_id', optionalAuth, (req, res) => {
  const agg = db.prepare(`
    SELECT ROUND(AVG(stars),2) as avg_stars, COUNT(*) as total,
      SUM(CASE WHEN stars=5 THEN 1 ELSE 0 END) as five,
      SUM(CASE WHEN stars=4 THEN 1 ELSE 0 END) as four,
      SUM(CASE WHEN stars=3 THEN 1 ELSE 0 END) as three,
      SUM(CASE WHEN stars=2 THEN 1 ELSE 0 END) as two,
      SUM(CASE WHEN stars=1 THEN 1 ELSE 0 END) as one,
      SUM(CASE WHEN verdict='Excellent' THEN 1 ELSE 0 END) as excellent,
      SUM(CASE WHEN verdict='Good' THEN 1 ELSE 0 END) as good,
      SUM(CASE WHEN verdict='Average' THEN 1 ELSE 0 END) as average,
      SUM(CASE WHEN verdict='Poor' THEN 1 ELSE 0 END) as poor,
      SUM(CASE WHEN verdict='Corrupt' THEN 1 ELSE 0 END) as corrupt
    FROM ratings WHERE politician_id=? AND is_flagged=0
  `).get(req.params.politician_id);

  const sessId = req.headers['x-session-id'];
  let userRating = null;
  if (req.user) userRating = db.prepare(`SELECT * FROM ratings WHERE politician_id=? AND user_id=?`).get(req.params.politician_id, req.user.id);
  if (!userRating && sessId) userRating = db.prepare(`SELECT * FROM ratings WHERE politician_id=? AND session_id=?`).get(req.params.politician_id, sessId);

  const recentReviews = db.prepare(`
    SELECT r.stars, r.verdict, r.review_text, r.created_at, u.username, u.display_name
    FROM ratings r LEFT JOIN users u ON u.id=r.user_id
    WHERE r.politician_id=? AND r.is_flagged=0 AND r.review_text IS NOT NULL
    ORDER BY r.helpful_count DESC, r.created_at DESC LIMIT 10
  `).all(req.params.politician_id);

  res.json({ aggregate: agg, userRating, recentReviews });
});

router.post('/', optionalAuth, (req, res) => {
  const { politician_id, stars, verdict, review_text } = req.body;
  const sessId = req.headers['x-session-id'];
  if (!politician_id || !stars || !sessId) return res.status(400).json({ error: 'politician_id, stars, x-session-id required' });
  if (stars < 1 || stars > 5) return res.status(400).json({ error: 'Stars must be 1-5' });
  if (!db.prepare(`SELECT id FROM politicians WHERE id=?`).get(politician_id)) return res.status(404).json({ error: 'Politician not found' });

  db.prepare(`
    INSERT INTO ratings (politician_id, user_id, session_id, stars, verdict, review_text)
    VALUES (?,?,?,?,?,?)
    ON CONFLICT(politician_id, session_id) DO UPDATE SET
      stars=excluded.stars, verdict=excluded.verdict, review_text=excluded.review_text, updated_at=CURRENT_TIMESTAMP
  `).run(politician_id, req.user?.id || null, sessId, stars, verdict||null, review_text||null);

  // Real-time rating update
  const agg = db.prepare(`SELECT ROUND(AVG(stars),2) as avg_stars, COUNT(*) as total FROM ratings WHERE politician_id=?`).get(politician_id);
  global.io?.emit('rating:update', { politician_id, ...agg });

  res.json({ ok: true });
});

router.post('/:id/helpful', optionalAuth, (req, res) => {
  db.prepare(`UPDATE ratings SET helpful_count=helpful_count+1 WHERE id=?`).run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
