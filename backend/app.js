require('dotenv').config();

const compression = require('compression');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const {
  CHAT_ENABLED,
  FRONTEND_DIR,
  IS_SERVERLESS,
  SOCKETS_ENABLED,
  UPLOAD_DIR,
} = require('./runtime');

function createApp(options = {}) {
  const {
    serveFrontend = false,
    serveUploads = false,
  } = options;

  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: '*', exposedHeaders: ['X-Cache', 'X-Total-Count'] }));
  app.use(compression());
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '20kb' }));
  app.use(express.urlencoded({ extended: true }));

  const globalLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, message: { error: 'Rate limit exceeded' } });
  const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { error: 'Too many auth requests' } });
  const chatLimit = rateLimit({ windowMs: 60 * 1000, max: 20, message: { error: 'Chat limit reached' } });
  const writeLimit = rateLimit({ windowMs: 60 * 1000, max: 30, message: { error: 'Write limit reached' } });

  app.use('/api/', globalLimit);
  app.use('/api/auth', authLimit);
  app.use('/api/chat', chatLimit);
  app.use(['/api/ratings', '/api/comments', '/api/polls'], writeLimit);

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/politicians', require('./routes/politicians'));
  app.use('/api/parties', require('./routes/parties'));
  app.use('/api/states', require('./routes/states'));
  app.use('/api/legal', require('./routes/legal'));
  app.use('/api/ratings', require('./routes/ratings'));
  app.use('/api/comments', require('./routes/comments'));
  app.use('/api/news', require('./routes/news'));
  app.use('/api/polls', require('./routes/polls'));
  app.use('/api/watchlist', require('./routes/watchlist'));
  app.use('/api/assets', require('./routes/assets'));
  app.use('/api/timeline', require('./routes/timeline'));
  app.use('/api/factcheck', require('./routes/factcheck'));
  app.use('/api/search', require('./routes/search'));
  app.use('/api/stats', require('./routes/stats'));
  app.use('/api/analytics', require('./routes/analytics'));
  app.use('/api/admin', require('./routes/admin'));
  app.use('/api/compare', require('./routes/compare'));
  app.use('/api/chat', require('./routes/chat'));
  app.use('/api/notifications', require('./routes/notifications'));
  app.use('/api/uploads', require('./routes/uploads'));

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      version: '2.0.0',
      ts: new Date().toISOString(),
      deployment: IS_SERVERLESS ? 'serverless' : 'node',
      features: {
        chat: CHAT_ENABLED,
        realtime: SOCKETS_ENABLED,
        uploads: true,
      },
    });
  });

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  if (serveUploads) {
    app.use('/uploads', express.static(UPLOAD_DIR));
  }

  if (serveFrontend) {
    app.use(express.static(FRONTEND_DIR));
    app.get('*', (req, res) => {
      res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
    });
  }

  app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large' });
    }

    if (err.message === 'File type not allowed') {
      return res.status(400).json({ error: err.message });
    }

    console.error('[ERROR]', err.message);
    return res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
