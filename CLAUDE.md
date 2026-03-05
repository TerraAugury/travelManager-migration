# CLAUDE.md — travelManager-migration

## Project Overview

A family travel manager app migrated from a static single-page app (localStorage)
to a Cloudflare-native architecture with D1 (SQLite).

**Stack:** Hono (Cloudflare Workers, ESM) · Cloudflare D1 (SQLite) · Cloudflare Pages · vanilla JS frontend

**Migration phases:**
- Phases 1–4 complete: scaffold, data model, API v1, frontend integration
- Phase 5 complete: Cloudflare migration (Workers + D1 + Pages)
- Phase 6 pending: data import from legacy JSON export

---

## Repository Rules (from Agents.md)

- **200-line hard limit** on every source, config, and documentation file.
  Split into smaller modules if a change would exceed this.
- **Never commit secrets.** Use `.env` (gitignored); commit only `.env.example`
  with placeholder values. Rotate any accidentally exposed secrets immediately.
- **No generated artifacts, caches, local DB files, or logs** in git.
- **Small, focused commits** with clear messages.

---

## Architecture

```
/
├── js/               Legacy static frontend (still served as fallback)
├── frontend/         Cloudflare Pages frontend (API-backed, modular ESM)
│   ├── _routes.json  Pages routing: proxy /api/* /auth/* /health to Worker
│   ├── _headers      Security headers for Pages
│   └── src/          api.js · state.js · forms.js · render.js · ...
├── backend/          Cloudflare Worker (Hono)
│   ├── wrangler.toml Wrangler config (D1 binding, compatibility flags)
│   ├── migrations/   001_initial_schema.sql · 002_sessions.sql
│   └── src/          routes/ · repositories/ · services/ · auth/ · cli/
├── scripts/          Operational scripts (cutover, smoke, security)
└── .github/workflows/ci.yml
```

Worker serves `POST /auth/*`, `GET|POST|PATCH|DELETE /api/trips/*`,
`/api/sync/trips` (legacy bridge), `/api/flights/lookup?fn=XX123[&provider=aerodatabox][&date=YYYY-MM-DD]` (AviationStack or AeroDataBox; keys in Cloudflare secrets),
and `/health`.

---

## Development Commands

### Backend (`cd backend`)

```bash
npm install
npm run dev              # wrangler dev (local Worker + D1)
npm run migrate:local    # wrangler d1 migrations apply --local
npm run migrate:remote   # wrangler d1 migrations apply --remote
npm run seed:admin       # outputs SQL to run via wrangler d1 execute
npm run lint             # node --check on all source files
npm test                 # node --test
npm run build            # lint + test
```

### Frontend (`cd frontend`)

```bash
npm run lint         # node --check on all source files
npm test             # node --test test/*.test.js
npm run build        # lint + test
```

### Cloudflare Deployment

```bash
# One-time setup: create D1 database
wrangler d1 create travel-manager
# Paste the database_id into backend/wrangler.toml

# Apply migrations
cd backend && npm run migrate:remote

# Seed admin user (outputs SQL to run manually)
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=... node src/cli/seed-admin.js

# Optional: enable AviationStack flight lookup (free tier: 100 req/month)
wrangler secret put AVIATIONSTACK_API_KEY

# Deploy Worker
cd backend && npm run deploy

# Deploy frontend to Pages (via Cloudflare dashboard or wrangler pages deploy)
# Point Pages project to frontend/ directory
# Set Worker route for /api/* in Pages settings
```

### Cutover scripts

```bash
# Import legacy JSON data
ADMIN_EMAIL=... ADMIN_PASSWORD=... scripts/cutover-import.sh /path/to/trips.json

# Smoke test against live API
ADMIN_EMAIL=... ADMIN_PASSWORD=... scripts/smoke-api.sh https://your-worker.workers.dev
```

---

## Validation Checklist (run before opening/updating PRs)

| Changed area | Commands |
|---|---|
| `backend/` | `npm run lint` · `npm test` · `npm run build` |
| `frontend/` | `npm run lint` · `npm test` · `npm run build` |
| `scripts/` | `bash -n scripts/*.sh` |
| Any PR | `scripts/security-scan.sh` · `npm audit` (if deps changed) |

CI runs all four jobs automatically: `backend`, `frontend`,
`infra_and_scripts`, `security`.

---

## Security Baseline

- Parameterized queries only — no string-built SQL.
- Escape all untrusted output rendered into HTML (XSS prevention).
- Validate and sanitize all external input before use.
- Never log tokens, passwords, or personal identifiers.
- Pin dependency versions.
- Run `scripts/security-scan.sh` (ripgrep-based secret scan) before every push.
- Third-party API keys (e.g. `AVIATIONSTACK_API_KEY`) go in Cloudflare secrets
  (`wrangler secret put`) for production and in `.dev.vars` (gitignored) for
  local dev. Never hardcode or commit them.
