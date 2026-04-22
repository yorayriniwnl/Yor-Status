/**
 * Simple in-memory cache — drop-in Redis replacement for development.
 * Replace with ioredis in production by swapping the get/set/del methods.
 */
const store = new Map();

function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expires && entry.expires < Date.now()) { store.delete(key); return null; }
  return entry.value;
}

function set(key, value, ttlSeconds = 60) {
  store.set(key, { value, expires: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null });
}

function del(key) { store.delete(key); }

function delPattern(pattern) {
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  for (const key of store.keys()) if (regex.test(key)) store.delete(key);
}

// Express middleware factory
function cacheMiddleware(ttlSeconds = 60) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();
    const key = `cache:${req.originalUrl}`;
    const cached = get(key);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }
    const origJson = res.json.bind(res);
    res.json = (data) => {
      set(key, data, ttlSeconds);
      res.setHeader('X-Cache', 'MISS');
      return origJson(data);
    };
    next();
  };
}

module.exports = { get, set, del, delPattern, cacheMiddleware };
