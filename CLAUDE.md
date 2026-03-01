# CLAUDE.md — travelManager-migration

## Project Overview

A family travel manager app being migrated from a static single-page app
(localStorage) to a self-hosted frontend/backend architecture with Postgres.

**Stack:** Fastify (Node.js, ESM) · PostgreSQL · Caddy · Docker Compose · vanilla JS frontend

**Migration phases:**
- Phases 1–4 complete: scaffold, data model, API v1, frontend integration
- Phase 5 in progress: production cutover (import, backups, Tailscale access)

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
├── frontend/         Migrated frontend (API-backed, modular ESM)
│   └── src/          api.js · state.js · forms.js · render.js · ...
├── backend/          Fastify API
│   └── src/          routes/ · repositories/ · services/ · auth/ · cli/
├── infra/            Docker Compose + Caddyfile
├── scripts/          Operational scripts (cutover, backup, smoke, security)
└── .github/workflows/ci.yml
```

Backend serves `POST /auth/*`, `GET|POST|PATCH|DELETE /api/trips/*`,
`/api/sync/trips` (legacy bridge), and `/health`.

---

## Development Commands

### Backend (`cd backend`)

```bash
npm install
npm run dev          # node --watch
npm run migrate      # run DB migrations
npm run seed:admin   # bootstrap admin user
npm run lint         # node --check on all source files
npm test             # node --test
npm run build        # lint + test
```

### Frontend (`cd frontend`)

```bash
npm run lint         # node --check on all source files
npm test             # node --test test/*.test.js
npm run build        # lint + test
```

### Infrastructure

```bash
cp .env.example .env   # then set POSTGRES_PASSWORD

# Start full stack
docker compose -f infra/docker-compose.yml --env-file .env up -d --build

# Validate compose config (no .env needed)
docker compose -f infra/docker-compose.yml --env-file .env.example config

# Health check
curl http://localhost/api/health
curl http://localhost/api/health/db
```

### Cutover scripts

```bash
# Preflight checks
ADMIN_EMAIL=... ADMIN_PASSWORD=... scripts/cutover-preflight.sh /path/to/trips.json

# Full cutover (backup → import → smoke)
ADMIN_EMAIL=... ADMIN_PASSWORD=... scripts/cutover-run.sh /path/to/trips.json

# Individual steps: backup-db.sh · cutover-import.sh · smoke-api.sh
# Restore verification: backup-restore-smoke.sh
# Tailscale private access: scripts/tailscale-private-access.sh start 80
```

---

## Validation Checklist (run before opening/updating PRs)

| Changed area | Commands |
|---|---|
| `backend/` | `npm run lint` · `npm test` · `npm run build` |
| `frontend/` | `npm run lint` · `npm test` · `npm run build` |
| `infra/` or scripts | `docker compose … config` · `bash -n scripts/*.sh` |
| Any PR | `scripts/security-scan.sh` · `npm audit` (if deps changed) |

CI runs all four jobs automatically: `backend`, `frontend`,
`infra_and_scripts`, `security`.

---

## Security Baseline

- Parameterized queries only — no string-built SQL.
- Escape all untrusted output rendered into HTML (XSS prevention).
- Validate and sanitize all external input before use.
- Never log tokens, passwords, or personal identifiers.
- Least-privilege DB credentials; pin dependency versions.
- Run `scripts/security-scan.sh` (ripgrep-based secret scan) before every push.
