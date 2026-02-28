#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: scripts/cutover-import.sh <legacy_trips.json>" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
IMPORT_FILE="$1"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Create it from .env.example first." >&2
  exit 1
fi
if [[ ! -f "${IMPORT_FILE}" ]]; then
  echo "Import file not found: ${IMPORT_FILE}" >&2
  exit 1
fi

set -a
source "${ENV_FILE}"
set +a

API_BASE_URL="${API_BASE_URL:-http://localhost/api}"

if [[ -z "${ADMIN_EMAIL:-}" || -z "${ADMIN_PASSWORD:-}" ]]; then
  echo "Set ADMIN_EMAIL and ADMIN_PASSWORD in environment before running." >&2
  echo "Example: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=... scripts/cutover-import.sh file.json" >&2
  exit 1
fi

LOGIN_PAYLOAD="$(printf '{"email":"%s","password":"%s"}' "$ADMIN_EMAIL" "$ADMIN_PASSWORD")"
LOGIN_RESPONSE="$(curl -sS -X POST "${API_BASE_URL}/auth/login" \
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
  echo "Login failed. Response:" >&2
  echo "${LOGIN_RESPONSE}" >&2
  exit 1
fi

IMPORT_RESPONSE="$(curl -sS -X PUT "${API_BASE_URL}/sync/trips" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  --data-binary "@${IMPORT_FILE}")"

printf '%s\n' "${IMPORT_RESPONSE}" | node -e '
let data = "";
process.stdin.on("data", (c) => data += c);
process.stdin.on("end", () => {
  try {
    const json = JSON.parse(data || "{}");
    const count = Number(json.importedTrips || 0);
    console.log(`Import finished. importedTrips=${count}`);
  } catch {
    console.log("Import completed but response parsing failed.");
  }
});
'

