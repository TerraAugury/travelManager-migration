# Self-Hosted Migration Plan

This file tracks migration from static-only app to frontend/backend architecture.

## Phase 1: Scaffold (completed)

- Added `frontend/`, `backend/`, `infra/`, and `scripts/`.
- Added backend service with health endpoints.
- Added Docker Compose stack: Postgres + backend + Caddy.
- Added `.env.example` and basic run docs.

## Phase 2: Data model (completed)

- Added migration runner and tracking table support.
- Added initial SQL schema migration:
  - users
  - trips
  - passengers and mappings
  - flight records
  - hotel records
- Added indexes, foreign keys, and integrity checks.
- Added initial repository module (`tripsRepository`).
- Added migration/schema/repository/password tests.
- Added admin bootstrap CLI (`seed-admin`).

## Phase 3: API v1 (completed)

- Added first authenticated data endpoints:
  - trips CRUD
  - trip flights list/create/delete
  - trip hotels list/create/delete
  - trip passengers list
- Added login/session flow:
  - `POST /auth/login`
  - `GET /auth/me`
  - `POST /auth/logout`
- Added request validation helpers and bearer-token auth guard.
- Added repositories for users, passengers, flights, and hotels.
- Added sessions repository and token security helpers.
- Added `/sync/trips` bridge endpoints for legacy frontend payload migration.

## Phase 4: Frontend integration (in progress)

- Introduce an API client layer.
- Replace localStorage writes with API calls.
- Keep existing UI behavior and screens.
- Added migrated frontend UI for:
  - auth login/logout
  - trips list/create/delete
  - trip update/edit form for active trip
  - per-trip flights list/create/delete
  - per-trip hotels list/create/delete
  - per-trip passengers listing
  - richer flight/hotel input coverage (airline, PNR, times, confirmation, payment, pax, passenger names)

## Phase 5: Cutover (in progress)

- Import existing JSON data into Postgres.
- Enable backups and restore test.
- Restrict access through Tailscale.
- Added operational scripts:
  - `scripts/backup-db.sh` and `scripts/restore-db.sh` for DB backups and restores
  - `scripts/cutover-import.sh` for legacy JSON import through API
  - `scripts/smoke-api.sh` for post-cutover health/auth/trips smoke checks
  - `scripts/backup-restore-smoke.sh` for restore verification end to end
  - `scripts/tailscale-private-access.sh` for private tailnet-only access
- Added `infra/docker-compose.private.yml` for localhost-only port binding before Tailscale sharing.
