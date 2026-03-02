#!/usr/bin/env bash
# dev.sh — run the full app locally (backend Worker + frontend Pages dev)
#
# Usage:
#   ./dev.sh              # start both servers
#   ./dev.sh --migrate    # apply local D1 migrations first, then start
#
# Requires:
#   wrangler (npm i -g wrangler  OR  available via npx)
#
# Ports:
#   8787  — Cloudflare Worker (backend API + D1)
#   8788  — Cloudflare Pages dev (frontend; proxies /api/* to Worker)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
WORKER_PORT=8787
PAGES_PORT=8788

# ── helpers ──────────────────────────────────────────────────────────────────

log()  { printf '\033[1;34m[dev]\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m[dev]\033[0m %s\n' "$*"; }
err()  { printf '\033[1;31m[dev]\033[0m %s\n' "$*" >&2; }
die()  { err "$*"; exit 1; }

have() { command -v "$1" >/dev/null 2>&1; }

wrangler() {
  if have wrangler; then
    command wrangler "$@"
  elif have npx; then
    npx --yes wrangler "$@"
  else
    die "wrangler not found. Install with: npm i -g wrangler"
  fi
}

wait_for_port() {
  local port=$1 label=$2 tries=30
  log "Waiting for $label on :$port …"
  for _ in $(seq 1 $tries); do
    if curl -sf "http://localhost:$port/health" >/dev/null 2>&1; then
      ok "$label is ready on :$port"
      return 0
    fi
    sleep 1
  done
  die "$label did not start on :$port after ${tries}s"
}

cleanup() {
  log "Shutting down…"
  kill "$(jobs -p)" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# ── install deps ──────────────────────────────────────────────────────────────

if [[ ! -d "$BACKEND/node_modules" ]]; then
  log "Installing backend dependencies…"
  (cd "$BACKEND" && npm install --silent)
fi

if [[ ! -d "$FRONTEND/node_modules" ]]; then
  log "Installing frontend dependencies…"
  (cd "$FRONTEND" && npm install --silent)
fi

# ── optional migration step ───────────────────────────────────────────────────

if [[ "${1:-}" == "--migrate" ]]; then
  log "Applying local D1 migrations…"
  (cd "$BACKEND" && wrangler d1 migrations apply travel-manager --local)
  ok "Migrations applied."
fi

# ── start Worker ──────────────────────────────────────────────────────────────

log "Starting Worker on :$WORKER_PORT …"
(cd "$BACKEND" && wrangler dev --port "$WORKER_PORT" --log-level warn) &

wait_for_port "$WORKER_PORT" "Worker"

# ── start Pages dev ───────────────────────────────────────────────────────────

log "Starting Pages dev on :$PAGES_PORT …"
log "  Open http://localhost:$PAGES_PORT in your browser"
wrangler pages dev "$FRONTEND" \
  --proxy "$WORKER_PORT" \
  --port  "$PAGES_PORT"
