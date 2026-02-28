# Frontend Migration Notes

This folder now contains the first migrated frontend entrypoint.

## What is implemented

- `frontend/index.html` bootstraps the migrated UI.
- `frontend/src/*` provides a modular API-based frontend:
  - auth login/logout
  - list/create/delete trips
  - per-trip list/create/delete for flights and hotels
  - passenger list per trip
  - legacy export/import bridge via `/api/sync/trips`

## How to use

1. Start backend stack (`infra/docker-compose.yml`).
2. Open:
   - `http://localhost/frontend/index.html` (through Caddy)
3. Log in with seeded admin account.

## Migration status

- Existing root UI is still available for fallback.
- New frontend already reads/writes through backend API.
- Next step is richer field coverage and full timeline-style parity.
