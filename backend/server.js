require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const compression = require('compression');
const rateLimit  = require('express-rate-limit');
const path       = require('path');
const cron       = require('node-cron');
const jwt        = require('jsonwebtoken');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*' },
  transports: ['websocket', 'polling']
});
global.io = io; // shared with services

const PORT = process.env.PORT || 3001;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');

/* ── SECURITY / MIDDLEWARE ── */
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', exposedHeaders: ['X-Cache','X-Total-Count'] }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: true }));

/* ── RATE LIMITS ── */
const globalLimit = rateLimit({ windowMs: 15*60*1000, max: 1000, message: { error: 'Rate limit exceeded' } });
const authLimit   = rateLimit({ windowMs: 15*60*1000, max: 30,   message: { error: 'Too many auth requests' } });
const chatLimit   = rateLimit({ windowMs: 60*1000,    max: 20,   message: { error: 'Chat limit reached' } });
const writeLimit  = rateLimit({ windowMs: 60*1000,    max: 30,   message: { error: 'Write limit reached' } });

app.use('/api/', globalLimit);
app.use('/api/auth', authLimit);
app.use('/api/chat', chatLimit);
app.use(['/api/ratings','/api/comments','/api/polls'], writeLimit);

/* ── API ROUTES ── */
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/politicians', require('./routes/politicians'));
app.use('/api/parties',     require('./routes/parties'));
app.use('/api/states',      require('./routes/states'));
app.use('/api/legal',       require('./routes/legal'));
app.use('/api/ratings',     require('./routes/ratings'));
app.use('/api/comments',    require('./routes/comments'));
app.use('/api/news',        require('./routes/news'));
app.use('/api/polls',       require('./routes/polls'));
app.use('/api/watchlist',   require('./routes/watchlist'));
app.use('/api/assets',      require('./routes/assets'));
app.use('/api/timeline',    require('./routes/timeline'));
app.use('/api/factcheck',   require('./routes/factcheck'));
app.use('/api/search',      require('./routes/search'));
app.use('/api/stats',       require('./routes/stats'));
app.use('/api/analytics',   require('./routes/analytics'));
app.use('/api/admin',       require('./routes/admin'));
app.use('/api/compare',     require('./routes/compare'));
app.use('/api/chat',        require('./routes/chat'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/uploads',     require('./routes/uploads'));

/* ── STATIC: uploads ── */
app.use('/uploads', express.static(UPLOAD_DIR));

/* ── STATIC: frontend ── */
const FRONTEND = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND));

/* ── HEALTH CHECK ── */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', ts: new Date().toISOString() });
});

/* ── SPA FALLBACK ── */
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND, 'index.html'));
});

/* ── ERROR HANDLER ── */
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large' });
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

/* ── SOCKET.IO ── */
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      socket.userId = payload.sub;
      socket.join(`user:${payload.sub}`);
    } catch(e) { /* anonymous socket */ }
  }
  next();
});

io.on('connection', (socket) => {
  socket.on('join:page', (page) => socket.join(`page:${page}`));
  socket.on('leave:page', (page) => socket.leave(`page:${page}`));
  socket.on('disconnect', () => {});
});

/* ── CRON: news refresh placeholder ── */
cron.schedule('0 */2 * * *', () => {
  // Hourly news refresh hook — wire up real RSS parser here
  console.log('[CRON] News refresh tick');
});

/* ── START ── */
server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║  YorStatus India v2.0  ·  Port ${PORT}         ║
  ║  http://localhost:${PORT}                       ║
  ║  WebSocket: ws://localhost:${PORT}              ║
  ╚══════════════════════════════════════════════╝`);
});

module.exports = { app, server, io };
