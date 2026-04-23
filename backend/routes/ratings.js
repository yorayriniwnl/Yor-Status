const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { optionalAuth } = require('../middleware/auth');
const { del } = require('../services/cache');

const VERDICTS = ['Excellent', 'Good', 'Average', 'Poor', 'Corrupt'];

function clearRatingCaches() {
  del('cache:/api/politicians*');
  del('cache:/api/stats*');
}

router.get('/:politician_id', optionalAuth, (req, res) => {
  const agg = db.prepare(`
    SELECT ROUND(AVG(stars),2) as avg_stars, COUNT(*) as total,
      COALESCE(SUM(CASE WHEN stars=5 THEN 1 ELSE 0 END), 0) as five,
      COALESCE(SUM(CASE WHEN stars=4 THEN 1 ELSE 0 END), 0) as four,
      COALESCE(SUM(CASE WHEN stars=3 THEN 1 ELSE 0 END), 0) as three,
      COALESCE(SUM(CASE WHEN stars=2 THEN 1 ELSE 0 END), 0) as two,
      COALESCE(SUM(CASE WHEN stars=1 THEN 1 ELSE 0 END), 0) as one,
      COALESCE(SUM(CASE WHEN verdict='Excellent' THEN 1 ELSE 0 END), 0) as excellent,
      COALESCE(SUM(CASE WHEN verdict='Good' THEN 1 ELSE 0 END), 0) as good,
      COALESCE(SUM(CASE WHEN verdict='Average' THEN 1 ELSE 0 END), 0) as average,
      COALESCE(SUM(CASE WHEN verdict='Poor' THEN 1 ELSE 0 END), 0) as poor,
      COALESCE(SUM(CASE WHEN verdict='Corrupt' THEN 1 ELSE 0 END), 0) as corrupt
    FROM ratings WHERE politician_id=? AND is_flagged=0
  `).get(req.params.politician_id);

  const sessId = req.headers['x-session-id'];
  let userRating = null;
  if (req.user) userRating = db.prepare(`SELECT * FROM ratings WHERE politician_id=? AND user_id=? ORDER BY updated_at DESC, created_at DESC LIMIT 1`).get(req.params.politician_id, req.user.id);
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
  const starsValue = parseInt(stars, 10);
  if (!politician_id || !stars || !sessId) return res.status(400).json({ error: 'politician_id, stars, x-session-id required' });
  if (!Number.isInteger(starsValue) || starsValue < 1 || starsValue > 5) return res.status(400).json({ error: 'Stars must be 1-5' });
  if (verdict && !VERDICTS.includes(verdict)) return res.status(400).json({ error: 'Invalid verdict' });
  if (review_text && String(review_text).length > 2000) return res.status(400).json({ error: 'Review must be 2000 characters or less' });
  if (!db.prepare(`SELECT id FROM politicians WHERE id=?`).get(politician_id)) return res.status(404).json({ error: 'Politician not found' });

  const saveRating = db.transaction(() => {
    const userId = req.user?.id || null;
    const cleanReview = review_text ? String(review_text).trim() : null;

    const existingByUser = userId
      ? db.prepare(`SELECT id FROM ratings WHERE politician_id=? AND user_id=? ORDER BY updated_at DESC, created_at DESC LIMIT 1`).get(politician_id, userId)
      : null;

    if (existingByUser) {
      db.prepare(`
        UPDATE ratings
        SET stars=?, verdict=?, review_text=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
      `).run(starsValue, verdict || null, cleanReview || null, existingByUser.id);
      return;
    }

    const existingBySession = db.prepare(`SELECT id FROM ratings WHERE politician_id=? AND session_id=?`).get(politician_id, sessId);
    if (existingBySession) {
      db.prepare(`
        UPDATE ratings
        SET user_id=COALESCE(?, user_id), stars=?, verdict=?, review_text=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
      `).run(userId, starsValue, verdict || null, cleanReview || null, existingBySession.id);
      return;
    }

    db.prepare(`
      INSERT INTO ratings (politician_id, user_id, session_id, stars, verdict, review_text)
      VALUES (?,?,?,?,?,?)
    `).run(politician_id, userId, sessId, starsValue, verdict || null, cleanReview || null);
  });

  saveRating();

  // Real-time rating update
  const agg = db.prepare(`SELECT ROUND(AVG(stars),2) as avg_stars, COUNT(*) as total FROM ratings WHERE politician_id=? AND is_flagged=0`).get(politician_id);
  global.io?.emit('rating:update', { politician_id, ...agg });
  clearRatingCaches();

  res.json({ ok: true });
});

router.post('/:id/helpful', optionalAuth, (req, res) => {
  const result = db.prepare(`UPDATE ratings SET helpful_count=helpful_count+1 WHERE id=?`).run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Rating not found' });
  res.json({ ok: true });
});

module.exports = router;
