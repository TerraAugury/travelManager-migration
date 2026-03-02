# Backend — Cloudflare Worker (Hono + D1)

Hono-based API running on Cloudflare Workers backed by Cloudflare D1 (SQLite).

## Local development

```bash
cd backend
npm install

# Apply migrations to the local D1 replica
npm run migrate:local

# Start the local Worker + D1 (hot-reload via wrangler dev)
npm run dev
```

Optional secrets for local dev — copy `.dev.vars.example` to `.dev.vars`:

```bash
cp .dev.vars.example .dev.vars
# edit .dev.vars and fill in values (e.g. AVIATIONSTACK_API_KEY)
```

`.dev.vars` is gitignored and loaded automatically by `wrangler dev`.

## Remote deployment

```bash
# One-time: create D1 and paste its ID into wrangler.toml
wrangler d1 create travel-manager

npm run migrate:remote   # apply migrations to production D1

# Seed admin (outputs SQL — pipe to wrangler d1 execute)
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=... node src/cli/seed-admin.js

wrangler secret put AVIATIONSTACK_API_KEY   # optional — see below
npm run deploy
```

## Validation

```bash
npm run lint   # node --check on all source files
npm test       # node --test
npm run build  # lint + test (run before every PR)
```

## Auth endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/login` | Returns `{ token }` |
| `GET`  | `/auth/me` | Returns current user |
| `POST` | `/auth/logout` | Revokes session token |

## Trip & event endpoints

| Method | Path |
|--------|------|
| `GET` / `POST` | `/trips` |
| `PATCH` / `DELETE` | `/trips/:tripId` |
| `GET` / `POST` | `/trips/:tripId/flights` |
| `PATCH` / `DELETE` | `/trips/:tripId/flights/:flightId` |
| `GET` / `POST` | `/trips/:tripId/hotels` |
| `PATCH` / `DELETE` | `/trips/:tripId/hotels/:hotelId` |
| `GET` | `/trips/:tripId/passengers` |

## Flight lookup (AviationStack)

```
GET /flights/lookup?fn=BA234
Authorization: Bearer <token>
```

Proxies the AviationStack real-time flight API server-side so the API key is
never exposed to the browser. Returns a snake_case object matching the flight
schema; the frontend uses it to auto-fill the Add Flight form.

Returns `503` if the secret is unset — the feature degrades gracefully.

Set in production:

```bash
wrangler secret put AVIATIONSTACK_API_KEY
```

Free tier: 100 requests/month at https://aviationstack.com/

## Legacy sync bridge

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/sync/trips` | Export in legacy JSON format |
| `PUT` | `/sync/trips` | Import from legacy JSON array |

## Health endpoints

- `GET /health`
- `GET /health/db`
