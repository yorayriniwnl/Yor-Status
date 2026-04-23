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

function del(key) {
  if (key.includes('*')) return delPattern(key);
  return store.delete(key);
}

function delPattern(pattern) {
  const regex = new RegExp('^' + pattern.split('*').map((part) => part.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')).join('.*') + '$');
  let deleted = 0;
  for (const key of store.keys()) {
    if (regex.test(key)) {
      store.delete(key);
      deleted++;
    }
  }
  return deleted;
}

function cachedPayload(entry) {
  if (entry && typeof entry === 'object' && Object.prototype.hasOwnProperty.call(entry, 'body')) {
    return entry;
  }
  return { body: entry, headers: {}, status: 200 };
}

function cacheableHeaders(res) {
  const headers = {};
  for (const name of ['X-Total-Count']) {
    const value = res.getHeader(name);
    if (value !== undefined) headers[name] = value;
  }
  return headers;
}

// Express middleware factory
function cacheMiddleware(ttlSeconds = 60) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();
    const key = `cache:${req.originalUrl}`;
    const cached = get(key);
    if (cached) {
      const payload = cachedPayload(cached);
      Object.entries(payload.headers || {}).forEach(([name, value]) => res.setHeader(name, value));
      res.setHeader('X-Cache', 'HIT');
      return res.status(payload.status || 200).json(payload.body);
    }
    const origJson = res.json.bind(res);
    res.json = (data) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        set(key, { body: data, headers: cacheableHeaders(res), status: res.statusCode }, ttlSeconds);
      }
      res.setHeader('X-Cache', 'MISS');
      return origJson(data);
    };
    next();
  };
}

module.exports = { get, set, del, delPattern, cacheMiddleware };
