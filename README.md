# YorStatus India Enterprise v2.0 🇮🇳
## India's #1 Political Accountability Platform

> **Built for scale. Designed to sell.**

---

## QUICK START (Root Folder)

```bash
npm install
cp backend/.env.example backend/.env   # Add ANTHROPIC_API_KEY
npm run seed                # Seed all data (~30 seconds)
npm start                   # http://localhost:3001
npm start                   # → http://localhost:3001
```

---

## FULL FEATURE LIST

### 🏠 Dashboard
- Live promise stats (Done / Progress / Pending / Broken)
- GDP Growth Leaderboard (top states)  
- Party Promise Performance bar chart (Chart.js)
- Highest rated politicians (from live DB)
- Most broken promises heat map
- Legal charges heat map
- Latest news feed

### 👤 Politicians (65 total)
- **26 Central Cabinet Ministers** — PM Modi, Amit Shah, Nirmala Sitharaman, Jaishankar, Gadkari and 21 more
- **31 Chief Ministers** — all states + J&K, Delhi, Puducherry (incl. new Bihar CM Samrat Choudhary)
- **8 Opposition Leaders** — Rahul Gandhi, Kejriwal, Akhilesh, Tejashwi and more
- Live ticking term clocks (d/h/m/s)
- Twitter profile photos (unavatar.io)
- Promise fulfillment stats with per-status filters
- Server-stored public approval ratings with star breakdowns + written reviews
- Legal charges panel inside each politician modal
- Fact check results  
- Timeline of key events
- Asset declaration (net worth from election affidavits)
- Recent news articles
- Watchlist + push notifications
- **Compare Tool** — side-by-side comparison of 2-4 politicians

### 📋 Party Manifestos (8 parties)
- BJP, INC, AAP, TMC, DMK, SP, JMM, CPI(M)
- Previous election promises vs actual delivery with real-world impact text
- Current manifesto tracking
- States currently governing
- Delivery rate progress bar

### 🗺️ State Tracker (31 states)
- Ranked horizontal bar chart by GDP growth (Chart.js)
- Long-term impact scores: Infrastructure / Welfare / Economy / Governance / Environment
- Key policy decisions with Positive/Negative/Mixed classification and impact text
- Full state metrics: GDP size, HDI, literacy, unemployment
- Recent state news
- State-specific public discussion (comments)
- Filter by party, sort by GDP / Welfare / HDI

### ⚖️ Legal Records
- **10 charge categories:** Criminal, Financial Fraud, Civil, Corporate/Business, Traffic/Minor, Cyber/IT, Special Laws (NDPS/UAPA), Corruption/DA, Contempt, Electoral Violations
- **7 status levels:** Active 🔴 | Pending 🟡 | Dismissed ✅ | Acquitted ✅ | Convicted ⚫ | Settled 🔵 | Stayed 🟠
- **4 severity levels:** Minor / Moderate / Serious / Severe
- Overview charts: by category, by party, most charged politicians
- Grouped by politician with expandable charge cards
- Case numbers, court, filing agency, dates, outcomes, source links
- Legal panel embedded in every politician modal
- Mod/Admin can add, update, delete charges (PATCH status + outcome live)

### 📰 News & Media
- Sentiment-tagged articles (Positive / Neutral / Negative)
- Link to politician or state
- Sentiment filter
- Image thumbnails
- Add articles via Admin panel or API

### ⭐ Approval Ratings
- 1–5 star ratings stored on server per session
- Verdict labels (Excellent / Good / Average / Poor / Corrupt)
- Written reviews with helpful voting
- Aggregated public approval % shown to all users
- Promise fulfillment breakdown bars
- Star distribution breakdown (1★ through 5★)
- Recent reviews panel in politician modal

### 🔔 Watchlist & Notifications
- Watch any politician (requires login)
- Real-time Socket.IO push notifications when:
  - A promise status changes
  - A new legal charge is added
- Notification panel with unread badge
- Mark all read / individual read

### 💬 Comments (Threaded)
- Per politician, state, party, news article, legal charge
- Upvote / downvote
- Flag for moderation
- Moderator can remove
- Real-time via Socket.IO

### 🔍 Global Search (⌘K)
- Searches politicians, states, parties, news, legal charges
- Trending queries widget
- Results open relevant modals

### 📊 Compare Tool
- Add 2–4 politicians via Compare button on cards
- Floating tray at bottom
- Side-by-side comparison: role, party, term, delivery rate, rating, charges, net worth

### ✅ Fact Checks
- Claim text + verdict (True / Mostly True / Half True / Mostly False / False / Unverifiable)
- Displayed inside politician modal
- Color-coded badges

### 💰 Asset Declarations
- Net worth from election affidavits by year
- Growth % calculation between elections
- Richest politicians leaderboard (API)

### 📅 Timeline Events
- Key events per politician: elections, arrests, achievements, scandals, policies
- Sorted by date, displayed in modal

### ⚙️ Admin Panel
- Summary stats (users, promises, ratings, comments, flags)
- User management (ban/unban, role assignment)
- Flagged comments review queue
- Audit log of all admin actions
- Moderators can update promise statuses live

### 🤖 AI Chat (Claude Sonnet)
- Reads live database context on every message
- Knows promise stats, GDP rankings, legal counts
- Rate limited: 20 req/min per IP
- Streamed through secure backend proxy

### 🔐 Authentication
- Register / Login (JWT, bcrypt)
- One-time admin setup endpoint
- Roles: user / moderator / admin / superadmin
- Token stored in localStorage
- Protected routes for mod/admin operations

---

## API REFERENCE

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, get JWT |
| GET | `/api/auth/me` | Current user profile |
| POST | `/api/auth/admin-setup` | One-time admin creation |
| GET | `/api/politicians` | List (tab, search, party, page) |
| GET | `/api/politicians/:id` | Full politician detail |
| PATCH | `/api/politicians/:id/promise/:pid` | Update promise status (mod) |
| GET | `/api/parties` | All parties with manifesto |
| GET | `/api/states` | All states (search, sort) |
| GET | `/api/states/leaderboard` | Top 10 by GDP |
| GET | `/api/legal` | All charges (filter by status/cat/severity) |
| GET | `/api/legal/meta/stats` | Charts data |
| POST | `/api/legal` | Add charge (mod) |
| PATCH | `/api/legal/:id` | Update charge status (mod) |
| GET | `/api/ratings/:politician_id` | Aggregate + user rating |
| POST | `/api/ratings` | Submit/update rating |
| GET | `/api/comments` | Comments for entity |
| POST | `/api/comments` | Post comment |
| POST | `/api/comments/:id/vote` | Vote comment |
| GET | `/api/news` | News (sentiment, politician filters) |
| POST | `/api/news` | Add article (mod) |
| GET | `/api/polls` | Active polls |
| POST | `/api/polls/:id/vote` | Vote in poll |
| GET | `/api/watchlist` | User's watchlist (auth) |
| POST | `/api/watchlist/:id` | Watch politician (auth) |
| GET | `/api/assets/:politician_id` | Asset declarations |
| GET | `/api/timeline/:politician_id` | Timeline events |
| GET | `/api/factcheck/:politician_id` | Fact checks |
| GET | `/api/search` | Global search |
| GET | `/api/compare?ids=1,2,3` | Compare politicians |
| GET | `/api/stats` | Dashboard aggregates |
| GET | `/api/analytics/dashboard` | Admin analytics |
| POST | `/api/analytics/pageview` | Track page view |
| GET | `/api/admin/users` | User management (admin) |
| GET | `/api/admin/flags` | Flagged comments (mod) |
| GET | `/api/admin/audit` | Audit log (admin) |
| POST | `/api/chat` | AI chat proxy |
| GET | `/api/notifications` | User notifications (auth) |
| POST | `/api/uploads` | File upload (auth) |

---

## DATABASE TABLES (20)

| Table | Purpose |
|-------|---------|
| `politicians` | All 65 tracked politicians |
| `promises` | Individual promises with status |
| `users` | Registered users |
| `sessions` | JWT sessions |
| `ratings` | Star ratings + verdicts + reviews |
| `legal_charges` | All charge records |
| `asset_declarations` | Election affidavit data |
| `news_articles` | News with sentiment |
| `polls` + `poll_options` + `poll_votes` | Live polling |
| `watchlist` | User–politician subscriptions |
| `notifications` | Push notifications |
| `comments` + `comment_votes` | Threaded discussions |
| `fact_checks` | Claim verification records |
| `parties` + `manifesto_promises` | Party data |
| `states` + `state_decisions` | State metrics + policy decisions |
| `timeline_events` | Politician career events |
| `comparisons` | Compare tool usage log |
| `uploads` | File attachments |
| `audit_log` | Admin action log |
| `page_views` + `search_logs` | Analytics |

---

## TECH STACK

| Layer | Technology |
|-------|-----------|
| Backend Runtime | Node.js 18+ / Express 4 |
| Database | SQLite (better-sqlite3) — swap to Postgres for production |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Real-time | Socket.IO 4 (WebSocket + fallback) |
| AI | Anthropic Claude Sonnet via API |
| Caching | In-memory (swap to Redis in production) |
| File uploads | Multer |
| Scheduled jobs | node-cron |
| Frontend | Vanilla HTML/CSS/JS (zero dependencies, zero build step) |
| 3D Background | Three.js r128 |
| Charts | Chart.js 4.4 |
| Fonts | Google Fonts (Bebas Neue, Syne, JetBrains Mono, Plus Jakarta Sans) |
| Photos | unavatar.io (Twitter profile pictures) |
| Security | helmet, express-rate-limit, cors, express-validator |

---

## PRODUCTION DEPLOYMENT

```bash
# 1. Set environment
NODE_ENV=production
JWT_SECRET=<64+ char random string>
ANTHROPIC_API_KEY=sk-ant-...

# 2. Use PM2
npm install -g pm2
pm2 start server.js --name yorstatus
pm2 save && pm2 startup

# 3. Nginx reverse proxy
server {
  listen 80;
  server_name yorstatus.in;
  location / { proxy_pass http://localhost:3001; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection 'upgrade'; }
}

# 4. Upgrade DB for scale
# Replace better-sqlite3 with pg (PostgreSQL) in db.js and routes.
# All queries use parameterized statements — migration is straightforward.
```

---

## MONETIZATION IDEAS (for $1B company pitch)

1. **B2G (Govt)** — State governments pay for citizen feedback dashboards
2. **B2B (Media)** — API subscriptions for news organizations (₹50K/month)
3. **B2C (Premium)** — Verified accounts, advanced analytics, export reports
4. **NGO/Research** — Dataset licensing for election watchdogs
5. **AdTech** — Context-safe political awareness ads (non-intrusive)
6. **Elections Intelligence** — Pre-election manifesto scoring SaaS for parties

---

Built with ❤️ for Indian democratic accountability  
Data sourced from: court records, ECI affidavits, CAG reports, news archives
