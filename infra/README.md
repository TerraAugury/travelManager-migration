# Infra Quick Start

This infrastructure stack runs:

- `db`: PostgreSQL
- `backend`: Fastify API
- `caddy`: reverse proxy serving frontend and `/api/*`

## 1) Prepare environment

From repository root:

```bash
cp .env.example .env
```

Then set a strong `POSTGRES_PASSWORD`.

## 2) Start services

```bash
docker compose -f infra/docker-compose.yml --env-file .env up -d --build
```

## 3) Verify health

```bash
curl http://localhost/api/health
curl http://localhost/api/health/db
```

The backend container runs database migrations before starting the API.

## 4) Stop services

```bash
docker compose -f infra/docker-compose.yml --env-file .env down
```

## 5) Tailscale (later step)

Install Tailscale on the host and share access with family devices.
After join, users can open the same app through the host's tailnet address.

## 6) Cutover checklist (Phase 5)

1. Backup database:

```bash
scripts/backup-db.sh
```

2. Import legacy trips JSON:

```bash
ADMIN_EMAIL=family-admin@example.com ADMIN_PASSWORD=... \
scripts/cutover-import.sh /path/to/trips.json
```

3. Run API smoke checks:

```bash
ADMIN_EMAIL=family-admin@example.com ADMIN_PASSWORD=... \
scripts/smoke-api.sh
```
