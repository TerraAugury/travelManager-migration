# Self-Hosted Migration Plan

This file tracks migration from static-only app to frontend/backend architecture.

## Phase 1: Scaffold (completed)

- Added `frontend/`, `backend/`, `infra/`, and `scripts/`.
- Added backend service with health endpoints.
- Added Docker Compose stack: Postgres + backend + Caddy.
- Added `.env.example` and basic run docs.

## Phase 2: Data model

- Create SQL migrations for:
  - users
  - trips
  - flight records
  - hotel records
  - passengers and mappings
- Add indexes and foreign keys.

## Phase 3: API v1

- Auth endpoints (family-only login).
- CRUD endpoints for trips, flights, hotels.
- Validation, sanitization, and paging.

## Phase 4: Frontend integration

- Introduce an API client layer.
- Replace localStorage writes with API calls.
- Keep existing UI behavior and screens.

## Phase 5: Cutover

- Import existing JSON data into Postgres.
- Enable backups and restore test.
- Restrict access through Tailscale.

