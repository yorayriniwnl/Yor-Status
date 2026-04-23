const express = require('express');
const router  = express.Router();
const db      = require('../db');
const upload  = require('../middleware/upload');
const { authenticate } = require('../middleware/auth');
const fs      = require('fs');
const path    = require('path');
const { UPLOAD_DIR } = require('../runtime');

router.post('/', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { entity_type, entity_id } = req.body;
  const result = db.prepare(`
    INSERT INTO uploads (filename, original_name, mimetype, size_bytes, entity_type, entity_id, uploaded_by)
    VALUES (?,?,?,?,?,?,?)
  `).run(req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, entity_type||null, entity_id||null, req.user.id);
  res.json({ ok: true, id: result.lastInsertRowid, filename: req.file.filename, url: `/api/uploads/file/${req.file.filename}` });
});

router.get('/file/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  if (filename !== req.params.filename) return res.status(400).json({ error: 'Invalid filename' });

  const filePath = path.resolve(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

  res.sendFile(filePath);
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
