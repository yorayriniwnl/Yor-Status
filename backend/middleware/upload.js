// ── middleware/upload.js ──
const crypto = require('crypto');
const multer = require('multer');
const path   = require('path');
const { UPLOAD_DIR, ensureDirSync } = require('../runtime');

ensureDirSync(UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, crypto.randomUUID() + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf','.jpg','.jpeg','.png','.webp','.doc','.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('File type not allowed'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_MB) || 10) * 1024 * 1024 }
});

module.exports = upload;
