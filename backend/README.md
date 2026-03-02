# Backend Service

Fastify API service for Travel Manager.

## Local run (without Docker)

```bash
cd backend
npm install
DATABASE_URL=postgresql://user:pass@localhost:5432/travel_manager PORT=8000 npm run dev
```

## Migrations

Run SQL migrations:

```bash
cd backend
DATABASE_URL=postgresql://user:pass@localhost:5432/travel_manager npm run migrate
```

Seed or update the admin account:

```bash
cd backend
DATABASE_URL=postgresql://user:pass@localhost:5432/travel_manager \
ADMIN_EMAIL=family-admin@example.com \
ADMIN_PASSWORD=change_me_123 \
ADMIN_DISPLAY_NAME="Family Admin" \
npm run seed:admin
```

## Health endpoints

- `GET /health`
- `GET /health/db`

When running through Caddy in `infra/`, the API is exposed under `/api/*`:

- `GET /api/health`
- `GET /api/health/db`

## Auth for current API stage

- Log in with `POST /auth/login` and use `Authorization: Bearer <token>`.
- Use `npm run seed:admin` to create the first account.
- Optional dev fallback:
  - set `DEV_AUTH_X_USER_ID_FALLBACK=true`
  - then `x-user-id` header is accepted for local migration/testing.
  - production startup rejects `DEV_AUTH_X_USER_ID_FALLBACK=true`.
- Login rate limiting:
  - `AUTH_LOGIN_RATE_LIMIT_WINDOW_MS` (default `900000`)
  - `AUTH_LOGIN_RATE_LIMIT_MAX_ATTEMPTS` (default `10`)

## Auth endpoints

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`

## CRUD endpoints (Phase 3 start)

- `GET /trips`
- `POST /trips`
- `GET /trips/:tripId`
- `PATCH /trips/:tripId`
- `DELETE /trips/:tripId`
- `GET /trips/:tripId/flights`
- `POST /trips/:tripId/flights`
- `PATCH /trips/:tripId/flights/:flightId`
- `DELETE /trips/:tripId/flights/:flightId`
- `GET /trips/:tripId/hotels`
- `POST /trips/:tripId/hotels`
- `PATCH /trips/:tripId/hotels/:hotelId`
- `DELETE /trips/:tripId/hotels/:hotelId`
- `GET /trips/:tripId/passengers`

## Legacy sync bridge (for current frontend)

- `GET /sync/trips`
  - Returns trip payload in legacy JSON structure used by existing UI.
- `PUT /sync/trips`
  - Replaces current user data from legacy JSON array payload.
  - Returns imported count and exported canonical payload.
