const Database = require('better-sqlite3');
const path = require('path');
const fs   = require('fs');

const DB_PATH = path.join(__dirname, 'data', 'yorstatus.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('cache_size = -64000'); // 64MB cache

db.exec(`
/* ═══════════════════════ CORE ═══════════════════════ */
CREATE TABLE IF NOT EXISTS politicians (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT UNIQUE NOT NULL,
  role        TEXT NOT NULL,
  state       TEXT NOT NULL,
  party       TEXT NOT NULL,
  twitter     TEXT,
  initials    TEXT,
  tab         TEXT NOT NULL CHECK(tab IN ('pm','cm','opp')),
  term_start  TEXT NOT NULL,
  term_end    TEXT NOT NULL,
  bio         TEXT,
  education   TEXT,
  constituency TEXT,
  age         INTEGER,
  net_worth_cr REAL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS promises (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  politician_id  INTEGER NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  status         TEXT NOT NULL CHECK(status IN ('done','prog','pend','brok')),
  category       TEXT NOT NULL,
  year_made      INTEGER,
  evidence_url   TEXT,
  verified_by    TEXT,
  last_reviewed  TEXT,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

/* ═══════════════════════ USERS & AUTH ═══════════════════════ */
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','moderator','admin','superadmin')),
  display_name  TEXT,
  avatar_url    TEXT,
  is_verified   INTEGER DEFAULT 0,
  is_banned     INTEGER DEFAULT 0,
  ban_reason    TEXT,
  last_login    DATETIME,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at  DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS password_resets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  used       INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL
);

/* ═══════════════════════ RATINGS & REVIEWS ═══════════════════════ */
CREATE TABLE IF NOT EXISTS ratings (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  politician_id INTEGER NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
  user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  session_id    TEXT NOT NULL,
  stars         INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5),
  verdict       TEXT,
  review_text   TEXT,
  helpful_count INTEGER DEFAULT 0,
  is_flagged    INTEGER DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(politician_id, session_id)
);

/* ═══════════════════════ LEGAL RECORDS ═══════════════════════ */
CREATE TABLE IF NOT EXISTS legal_charges (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  politician_id   INTEGER NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,
  status          TEXT NOT NULL CHECK(status IN ('active','pending','false','convicted','acquitted','settled','stayed')),
  title           TEXT NOT NULL,
  description     TEXT,
  case_number     TEXT,
  court           TEXT,
  filing_agency   TEXT,
  date_filed      TEXT,
  date_updated    TEXT,
  severity        TEXT CHECK(severity IN ('minor','moderate','serious','severe')),
  outcome         TEXT,
  source_url      TEXT,
  evidence_files  TEXT DEFAULT '[]',
  is_verified     INTEGER DEFAULT 1,
  added_by        INTEGER REFERENCES users(id),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

/* ═══════════════════════ ASSET DECLARATIONS ═══════════════════════ */
CREATE TABLE IF NOT EXISTS asset_declarations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  politician_id   INTEGER NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
  election_year   INTEGER NOT NULL,
  movable_assets  REAL DEFAULT 0,
  immovable_assets REAL DEFAULT 0,
  liabilities     REAL DEFAULT 0,
  net_worth       REAL DEFAULT 0,
  cash_in_hand    REAL DEFAULT 0,
  bank_deposits   REAL DEFAULT 0,
  investments     REAL DEFAULT 0,
  vehicles_value  REAL DEFAULT 0,
  properties_json TEXT DEFAULT '[]',
  source_url      TEXT,
  affidavit_url   TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

/* ═══════════════════════ NEWS & MEDIA ═══════════════════════ */
CREATE TABLE IF NOT EXISTS news_articles (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  politician_id   INTEGER REFERENCES politicians(id) ON DELETE SET NULL,
  party_id        INTEGER REFERENCES parties(id) ON DELETE SET NULL,
  state_name      TEXT,
  headline        TEXT NOT NULL,
  summary         TEXT,
  source_name     TEXT,
  source_url      TEXT UNIQUE,
  image_url       TEXT,
  published_at    DATETIME,
  sentiment       TEXT CHECK(sentiment IN ('positive','neutral','negative')),
  category        TEXT,
  is_featured     INTEGER DEFAULT 0,
  view_count      INTEGER DEFAULT 0,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

/* ═══════════════════════ POLLS ═══════════════════════ */
CREATE TABLE IF NOT EXISTS polls (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  description   TEXT,
  politician_id INTEGER REFERENCES politicians(id) ON DELETE CASCADE,
  created_by    INTEGER REFERENCES users(id),
  ends_at       DATETIME,
  is_active     INTEGER DEFAULT 1,
  total_votes   INTEGER DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS poll_options (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_id  INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  text     TEXT NOT NULL,
  votes    INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_id    INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id  INTEGER NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  user_id    INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(poll_id, session_id)
);

/* ═══════════════════════ WATCHLIST / ALERTS ═══════════════════════ */
CREATE TABLE IF NOT EXISTS watchlist (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  politician_id INTEGER NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
  alert_email   INTEGER DEFAULT 1,
  alert_push    INTEGER DEFAULT 1,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, politician_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT,
  entity_type   TEXT,
  entity_id     INTEGER,
  is_read       INTEGER DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

/* ═══════════════════════ COMMENTS (enhanced) ═══════════════════════ */
CREATE TABLE IF NOT EXISTS comments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type   TEXT NOT NULL CHECK(entity_type IN ('politician','state','party','news','legal')),
  entity_id     INTEGER NOT NULL,
  user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  session_id    TEXT NOT NULL,
  parent_id     INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  body          TEXT NOT NULL,
  upvotes       INTEGER DEFAULT 0,
  downvotes     INTEGER DEFAULT 0,
  is_flagged    INTEGER DEFAULT 0,
  is_removed    INTEGER DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comment_votes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  vote       INTEGER NOT NULL CHECK(vote IN (1,-1)),
  UNIQUE(comment_id, session_id)
);

/* ═══════════════════════ FACT CHECKS ═══════════════════════ */
CREATE TABLE IF NOT EXISTS fact_checks (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  politician_id INTEGER NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
  claim_text    TEXT NOT NULL,
  verdict       TEXT NOT NULL CHECK(verdict IN ('true','mostly_true','half_true','mostly_false','false','unverifiable')),
  explanation   TEXT,
  source_url    TEXT,
  checked_by    TEXT,
  checked_date  TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

/* ═══════════════════════ ANALYTICS ═══════════════════════ */
CREATE TABLE IF NOT EXISTS page_views (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  path          TEXT NOT NULL,
  entity_type   TEXT,
  entity_id     INTEGER,
  session_id    TEXT,
  referrer      TEXT,
  country       TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS search_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  query      TEXT NOT NULL,
  results    INTEGER DEFAULT 0,
  session_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

/* ═══════════════════════ PARTIES ═══════════════════════ */
CREATE TABLE IF NOT EXISTS parties (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  color       TEXT NOT NULL,
  founded     INTEGER,
  ideology    TEXT,
  seats_2024  INTEGER DEFAULT 0,
  states_json TEXT DEFAULT '[]',
  symbol_url  TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manifesto_promises (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  party_id   INTEGER NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  term       TEXT NOT NULL CHECK(term IN ('prev','curr')),
  year       INTEGER NOT NULL,
  title      TEXT NOT NULL,
  status     TEXT NOT NULL CHECK(status IN ('done','prog','pend','brok')),
  impact     TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

/* ═══════════════════════ STATES ═══════════════════════ */
CREATE TABLE IF NOT EXISTS states (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT UNIQUE NOT NULL,
  cm_name       TEXT NOT NULL,
  party         TEXT NOT NULL,
  gdp_growth    REAL NOT NULL,
  gdp_size      TEXT NOT NULL,
  hdi           REAL,
  literacy      REAL,
  unemployment  REAL,
  rank_gdp      INTEGER,
  score_infra   INTEGER DEFAULT 50,
  score_welfare INTEGER DEFAULT 50,
  score_economy INTEGER DEFAULT 50,
  score_govn    INTEGER DEFAULT 50,
  score_env     INTEGER DEFAULT 50,
  population_cr REAL,
  area_km2      INTEGER,
  capital       TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS state_decisions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  state_id   INTEGER NOT NULL REFERENCES states(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  type       TEXT NOT NULL CHECK(type IN ('pos','neg','mix')),
  impact     TEXT,
  year       INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

/* ═══════════════════════ COMPARISON TOOL ═══════════════════════ */
CREATE TABLE IF NOT EXISTS comparisons (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id      TEXT NOT NULL,
  politician_ids  TEXT NOT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

/* ═══════════════════════ TIMELINE EVENTS ═══════════════════════ */
CREATE TABLE IF NOT EXISTS timeline_events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  politician_id INTEGER NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
  event_date    TEXT NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  type          TEXT CHECK(type IN ('election','appointment','scandal','achievement','resignation','arrest','acquittal','policy','other')),
  source_url    TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

/* ═══════════════════════ UPLOADS / EVIDENCE ═══════════════════════ */
CREATE TABLE IF NOT EXISTS uploads (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  filename      TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mimetype      TEXT NOT NULL,
  size_bytes    INTEGER NOT NULL,
  entity_type   TEXT,
  entity_id     INTEGER,
  uploaded_by   INTEGER REFERENCES users(id),
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

/* ═══════════════════════ AUDIT LOG ═══════════════════════ */
CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER REFERENCES users(id),
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   INTEGER,
  old_value   TEXT,
  new_value   TEXT,
  ip_address  TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

/* ═══════════════════════ INDEXES ═══════════════════════ */
CREATE INDEX IF NOT EXISTS idx_promises_pol     ON promises(politician_id);
CREATE INDEX IF NOT EXISTS idx_promises_status  ON promises(status);
CREATE INDEX IF NOT EXISTS idx_ratings_pol      ON ratings(politician_id);
CREATE INDEX IF NOT EXISTS idx_legal_pol        ON legal_charges(politician_id);
CREATE INDEX IF NOT EXISTS idx_legal_status     ON legal_charges(status);
CREATE INDEX IF NOT EXISTS idx_news_pol         ON news_articles(politician_id);
CREATE INDEX IF NOT EXISTS idx_news_pub         ON news_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_polls_pol        ON polls(politician_id);
CREATE INDEX IF NOT EXISTS idx_comments_entity  ON comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_timeline_pol     ON timeline_events(politician_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user   ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_notifs_user      ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_pviews_path      ON page_views(path, created_at);
CREATE INDEX IF NOT EXISTS idx_assets_pol       ON asset_declarations(politician_id);
CREATE INDEX IF NOT EXISTS idx_factcheck_pol    ON fact_checks(politician_id);
CREATE INDEX IF NOT EXISTS idx_audit_user       ON audit_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_users_email      ON users(email);
`);

module.exports = db;
