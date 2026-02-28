# Backend Service

Fastify API service for Travel Manager.

## Local run (without Docker)

```bash
cd backend
npm install
DATABASE_URL=postgresql://user:pass@localhost:5432/travel_manager PORT=8000 npm run dev
```

## Health endpoints

- `GET /health`
- `GET /health/db`

When running through Caddy in `infra/`, the API is exposed under `/api/*`:

- `GET /api/health`
- `GET /api/health/db`

