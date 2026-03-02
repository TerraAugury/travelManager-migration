# Migration History

Tracks the migration of the Travel Manager from a static localStorage-only app
to a Cloudflare-native architecture.

## Phase 1: Scaffold (completed)

- Added `frontend/`, `backend/`, `infra/`, and `scripts/`.
- Added backend service with health endpoints.
- Added Docker Compose stack: Postgres + Fastify backend + Caddy.
- Added `.env.example` and basic run docs.

## Phase 2: Data model (completed)

- Added migration runner and tracking table support.
- Added initial SQL schema: users, trips, passengers, flight records, hotel records.
- Added indexes, foreign keys, and integrity checks.
- Added initial repository module (`tripsRepository`).
- Added migration/schema/repository/password tests.
- Added admin bootstrap CLI (`seed-admin`).

## Phase 3: API v1 (completed)

- Added authenticated CRUD endpoints for trips, flights, hotels, passengers.
- Added login/session flow: `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`.
- Added request validation helpers and bearer-token auth guard.
- Added repositories for users, sessions, passengers, flights, and hotels.
- Added `/sync/trips` bridge endpoints for legacy payload migration.

## Phase 4: Frontend integration (completed)

- Introduced API client layer; replaced localStorage writes with API calls.
- Shipped migrated frontend UI (auth, trips CRUD, flights, hotels, passengers,
  upcoming flights, daycount, all-trips statistics).
- Reused proven legacy screen logic via API-to-legacy adapter in `src/legacyAdapter.js`.

## Phase 5: Cloudflare migration (completed)

Replaced the self-hosted Docker/Postgres/Caddy stack with Cloudflare's free tier.

- **Backend:** Fastify → Hono on Cloudflare Workers.
- **Database:** PostgreSQL → Cloudflare D1 (SQLite). New migrations in
  `backend/migrations/`. SQL adapted for SQLite (no `array_agg`, subquery
  deletes/updates, JS-computed expiry timestamps, `crypto.randomUUID()`).
- **Frontend:** Served by Cloudflare Pages. `_routes.json` proxies `/api/*`
  to the Worker. Security headers via `_headers`.
- **Secrets:** Wrangler secrets replace `.env`; `.dev.vars` for local dev.
- **Infra removed:** Docker Compose files, Caddyfile, Tailscale scripts,
  and DB backup/restore scripts removed. `infra/` directory archived.
- **Operational scripts retained:** `cutover-import.sh`, `cutover-preflight.sh`,
  `cutover-run.sh`, `smoke-api.sh`, `security-scan.sh` — updated for
  Cloudflare Worker URL target.

## Phase 6: Data import (pending)

Import the family's historical trip data from the legacy JSON export into D1.

```bash
ADMIN_EMAIL=... ADMIN_PASSWORD=... \
  scripts/cutover-import.sh /path/to/trips.json
```

Run preflight checks first:

```bash
ADMIN_EMAIL=... ADMIN_PASSWORD=... \
  scripts/cutover-preflight.sh /path/to/trips.json
```

---

## Post-migration features

Features added after the Cloudflare deployment landed:

| Feature | Description |
|---------|-------------|
| AviationStack lookup | `GET /api/flights/lookup?fn=XX123` — Worker proxies AviationStack so the API key is never exposed; auto-fills the Add Flight form |
| Calendar view | Toggle on the Days by Country screen showing a 12-month flag-per-day grid for the selected passenger and year |
