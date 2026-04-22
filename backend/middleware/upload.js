// ── middleware/upload.js ──
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { v4: uuid } = require('uuid');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uuid() + ext);
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
