const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const FRONTEND_DIR = fs.existsSync(path.join(DIST_DIR, 'index.html'))
  ? DIST_DIR
  : path.join(ROOT_DIR, 'frontend');

const IS_VERCEL = process.env.VERCEL === '1' || Boolean(process.env.VERCEL);
const IS_SERVERLESS = IS_VERCEL || process.env.YORSTATUS_SERVERLESS === '1';
const PORT = parseInt(process.env.PORT || '3001', 10);

function resolveRuntimePath(targetPath) {
  if (!targetPath) {
    return targetPath;
  }

  return path.isAbsolute(targetPath)
    ? path.resolve(targetPath)
    : path.resolve(__dirname, targetPath);
}

const SOURCE_DB_PATH = resolveRuntimePath(
  process.env.YORSTATUS_SEED_DB_PATH || path.join(__dirname, 'data', 'yorstatus.seed.db')
);

const RUNTIME_DB_PATH = resolveRuntimePath(
  process.env.YORSTATUS_DB_PATH || (IS_SERVERLESS ? path.join('/tmp', 'yorstatus.db') : path.join(__dirname, 'data', 'yorstatus.db'))
);

const UPLOAD_DIR = resolveRuntimePath(
  process.env.UPLOAD_DIR || (IS_SERVERLESS ? path.join('/tmp', 'yorstatus-uploads') : path.join(__dirname, 'uploads'))
);

const CHAT_ENABLED = Boolean(process.env.ANTHROPIC_API_KEY);
const SOCKETS_ENABLED = !IS_SERVERLESS;

function ensureDirSync(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

module.exports = {
  ROOT_DIR,
  FRONTEND_DIR,
  IS_SERVERLESS,
  IS_VERCEL,
  PORT,
  SOURCE_DB_PATH,
  RUNTIME_DB_PATH,
  UPLOAD_DIR,
  CHAT_ENABLED,
  SOCKETS_ENABLED,
  ensureDirSync,
};
