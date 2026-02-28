# Self-Hosted Migration Plan

This file tracks migration from static-only app to frontend/backend architecture.

## Phase 1: Scaffold (completed)

- Added `frontend/`, `backend/`, `infra/`, and `scripts/`.
- Added backend service with health endpoints.
- Added Docker Compose stack: Postgres + backend + Caddy.
- Added `.env.example` and basic run docs.

## Phase 2: Data model (in progress)

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

## Phase 3: API v1 (started)

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

## Phase 4: Frontend integration

- Introduce an API client layer.
- Replace localStorage writes with API calls.
- Keep existing UI behavior and screens.
- Added migrated frontend UI for:
  - auth login/logout
  - trips list/create/delete
  - per-trip flights list/create/delete
  - per-trip hotels list/create/delete
  - per-trip passengers listing

## Phase 5: Cutover

- Import existing JSON data into Postgres.
- Enable backups and restore test.
- Restrict access through Tailscale.
- Added operational scripts:
  - `scripts/cutover-import.sh` for legacy JSON import through API
  - `scripts/smoke-api.sh` for post-cutover health/auth/trips smoke checks
