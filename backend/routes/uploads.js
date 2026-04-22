const express = require('express');
const router  = express.Router();
const db      = require('../db');
const upload  = require('../middleware/upload');
const { authenticate } = require('../middleware/auth');
const path    = require('path');

router.post('/', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { entity_type, entity_id } = req.body;
  const result = db.prepare(`
    INSERT INTO uploads (filename, original_name, mimetype, size_bytes, entity_type, entity_id, uploaded_by)
    VALUES (?,?,?,?,?,?,?)
  `).run(req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, entity_type||null, entity_id||null, req.user.id);
  res.json({ ok: true, id: result.lastInsertRowid, filename: req.file.filename, url: `/uploads/${req.file.filename}` });
});

router.get('/', authenticate, (req, res) => {
  const { entity_type, entity_id } = req.query;
  let sql = `SELECT u.*, usr.username FROM uploads u LEFT JOIN users usr ON usr.id=u.uploaded_by WHERE 1=1`;
  const params = [];
  if (entity_type) { sql += ` AND u.entity_type=?`; params.push(entity_type); }
  if (entity_id)   { sql += ` AND u.entity_id=?`;   params.push(entity_id); }
  sql += ` ORDER BY u.created_at DESC LIMIT 50`;
  res.json({ data: db.prepare(sql).all(...params) });
});

module.exports = router;
