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

## 5) Private mode with Tailscale

Use the private compose override to bind app ports to localhost only:

```bash
docker compose \
  -f infra/docker-compose.yml \
  -f infra/docker-compose.private.yml \
  --env-file .env \
  up -d --build
```

Then install and connect Tailscale on the host:

```bash
tailscale up
```

Publish local app access to your tailnet:

```bash
scripts/tailscale-private-access.sh start 80
```

Show status or stop sharing:

```bash
scripts/tailscale-private-access.sh status
scripts/tailscale-private-access.sh stop
```

Family user flow:

1. Install Tailscale and sign in to the shared tailnet.
2. Open the `https://<host>.tailnet-name.ts.net` URL shown by the script.
3. Log in to Travel Manager with their app account.

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

4. Verify backup/restore behavior:

```bash
ADMIN_EMAIL=family-admin@example.com ADMIN_PASSWORD=... \
scripts/backup-restore-smoke.sh
```
