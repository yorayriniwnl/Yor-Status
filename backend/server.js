require('dotenv').config();

const cron = require('node-cron');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const { createApp } = require('./app');
const { PORT } = require('./runtime');

const app = createApp({ serveFrontend: true, serveUploads: true });
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
});

global.io = io;

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required. Copy backend/.env.example to backend/.env and configure a strong secret.');
}

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      socket.userId = payload.sub;
      socket.join(`user:${payload.sub}`);
    } catch (error) {
      // Allow anonymous sockets in local development.
    }
  }

  next();
});

io.on('connection', (socket) => {
  socket.on('join:page', (page) => socket.join(`page:${page}`));
  socket.on('leave:page', (page) => socket.leave(`page:${page}`));
  socket.on('disconnect', () => {});
});

if (process.env.YORSTATUS_DISABLE_CRON !== '1') {
  cron.schedule('0 */2 * * *', () => {
    console.log('[CRON] News refresh tick');
  });
}

server.listen(PORT, () => {
  console.log(`YorStatus India v2.0 listening on http://localhost:${PORT}`);
});

module.exports = { app, io, server };
