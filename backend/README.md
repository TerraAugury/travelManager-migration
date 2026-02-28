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

- Current routes require `x-user-id` request header.
- Value must be an active user UUID from `users.id`.
- Use `npm run seed:admin` to create the first account.

## CRUD endpoints (Phase 3 start)

- `GET /trips`
- `POST /trips`
- `GET /trips/:tripId`
- `PATCH /trips/:tripId`
- `DELETE /trips/:tripId`
- `GET /trips/:tripId/flights`
- `POST /trips/:tripId/flights`
- `DELETE /trips/:tripId/flights/:flightId`
- `GET /trips/:tripId/hotels`
- `POST /trips/:tripId/hotels`
- `DELETE /trips/:tripId/hotels/:hotelId`
- `GET /trips/:tripId/passengers`
