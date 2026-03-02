# infra/ — Legacy pre-migration infrastructure (archived)

This directory previously contained the self-hosted Docker Compose stack:

- **PostgreSQL** database
- **Fastify** backend API
- **Caddy** reverse proxy

All Docker Compose files, the Caddyfile, and related scripts have been removed
as part of the Phase 5 Cloudflare migration. The stack is no longer used.

---

## Current deployment

The app now runs entirely on Cloudflare's free tier:

| Component | Service |
|-----------|---------|
| Backend API | Cloudflare Workers (Hono) |
| Database | Cloudflare D1 (SQLite) |
| Frontend | Cloudflare Pages |

See **`CLAUDE.md`** and **`backend/README.md`** for current deployment
instructions.

---

## Remaining operational scripts

The `scripts/` directory retains the scripts that still apply to the
Cloudflare deployment:

| Script | Purpose |
|--------|---------|
| `scripts/cutover-import.sh` | Import legacy JSON trips via `PUT /api/sync/trips` |
| `scripts/cutover-preflight.sh` | Pre-import environment and auth checks |
| `scripts/cutover-run.sh` | One-command import + smoke workflow |
| `scripts/smoke-api.sh` | Post-deploy health / auth / trips smoke tests |
| `scripts/security-scan.sh` | Ripgrep-based secret scan (run before every push) |

Scripts that depended on the Docker stack (database backup/restore,
Tailscale private access) have been removed.
