# Frontend Migration Notes

This folder will host the migrated frontend application.

## Current state

- The production UI still lives in the repository root:
  - `index.html`
  - `styles.css`
  - `js/`
  - `icon/`

## Target state

- Move UI into a dedicated frontend app:
  - `frontend/src/`
  - `frontend/public/`
- Replace direct `localStorage` data access with backend API calls.
- Keep UI behavior unchanged during migration.

## Phase order

1. Keep root UI running while backend is introduced.
2. Add an API client module.
3. Route reads/writes through backend endpoints.
4. Decommission root-only static mode when migration is complete.

