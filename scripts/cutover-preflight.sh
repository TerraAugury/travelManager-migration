#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
IMPORT_FILE="${1:-}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Create it from .env.example first." >&2
  exit 1
fi

for cmd in docker curl node; do
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "Missing required command: ${cmd}" >&2
    exit 1
  fi
done

set -a
source "${ENV_FILE}"
set +a

API_BASE_URL="${API_BASE_URL:-http://localhost/api}"

if [[ -z "${ADMIN_EMAIL:-}" || -z "${ADMIN_PASSWORD:-}" ]]; then
  echo "Set ADMIN_EMAIL and ADMIN_PASSWORD before running preflight." >&2
  exit 1
fi

if [[ -n "${IMPORT_FILE}" && ! -f "${IMPORT_FILE}" ]]; then
  echo "Legacy import file not found: ${IMPORT_FILE}" >&2
  exit 1
fi

if [[ -n "${IMPORT_FILE}" ]]; then
  node -e '
const fs = require("fs");
const path = process.argv[1];
const text = fs.readFileSync(path, "utf8");
const data = JSON.parse(text);
if (!Array.isArray(data)) {
  console.error("Import payload must be a JSON array.");
  process.exit(1);
}
console.log(`Import payload OK: ${data.length} trip items.`);
' "${IMPORT_FILE}"
fi

echo "1) Validating compose configuration"
docker compose -f "${ROOT_DIR}/infra/docker-compose.yml" --env-file "${ENV_FILE}" config >/dev/null
docker compose -f "${ROOT_DIR}/infra/docker-compose.yml" -f "${ROOT_DIR}/infra/docker-compose.private.yml" \
  --env-file "${ENV_FILE}" config >/dev/null
echo "   OK"

echo "2) Checking API health"
curl -fsS "${API_BASE_URL}/health" >/dev/null
curl -fsS "${API_BASE_URL}/health/db" >/dev/null
echo "   OK"

echo "3) Checking admin login and protected endpoints"
LOGIN_PAYLOAD="$(printf '{"email":"%s","password":"%s"}' "${ADMIN_EMAIL}" "${ADMIN_PASSWORD}")"
LOGIN_RESPONSE="$(curl -fsS -X POST "${API_BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "${LOGIN_PAYLOAD}")"

TOKEN="$(printf '%s' "${LOGIN_RESPONSE}" | node -e '
let data = "";
process.stdin.on("data", (c) => data += c);
process.stdin.on("end", () => {
  try {
    const json = JSON.parse(data || "{}");
    process.stdout.write(json.token || "");
  } catch {
    process.stdout.write("");
  }
});
')"

if [[ -z "${TOKEN}" ]]; then
  echo "Auth failed during preflight." >&2
  exit 1
fi

curl -fsS "${API_BASE_URL}/auth/me" -H "Authorization: Bearer ${TOKEN}" >/dev/null
curl -fsS "${API_BASE_URL}/trips" -H "Authorization: Bearer ${TOKEN}" >/dev/null
echo "   OK"

echo "4) Checking tailscale availability (optional)"
if command -v tailscale >/dev/null 2>&1; then
  tailscale status >/dev/null 2>&1 && echo "   Tailscale connected." || echo "   Tailscale installed but not connected."
else
  echo "   Tailscale CLI not installed yet (install before private exposure)."
fi

echo "Preflight passed."
