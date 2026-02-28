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

- Added first authenticated data endpoints with `x-user-id`:
  - trips CRUD
  - trip flights list/create/delete
  - trip hotels list/create/delete
  - trip passengers list
- Added request validation helpers and auth guard.
- Added repositories for users, passengers, flights, and hotels.
- Next: replace header-based auth with login/session flow.

## Phase 4: Frontend integration

- Introduce an API client layer.
- Replace localStorage writes with API calls.
- Keep existing UI behavior and screens.

## Phase 5: Cutover

- Import existing JSON data into Postgres.
- Enable backups and restore test.
- Restrict access through Tailscale.
