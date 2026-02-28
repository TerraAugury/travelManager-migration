#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Create it from .env.example first." >&2
  exit 1
fi

if [[ -z "${ADMIN_EMAIL:-}" || -z "${ADMIN_PASSWORD:-}" ]]; then
  echo "Set ADMIN_EMAIL and ADMIN_PASSWORD before running." >&2
  echo "Example: ADMIN_EMAIL=family-admin@example.com ADMIN_PASSWORD=... scripts/backup-restore-smoke.sh" >&2
  exit 1
fi

set -a
source "${ENV_FILE}"
set +a

API_BASE_URL="${API_BASE_URL:-http://localhost/api}"

login_token() {
  local payload response token
  payload="$(printf '{"email":"%s","password":"%s"}' "${ADMIN_EMAIL}" "${ADMIN_PASSWORD}")"
  response="$(curl -sS -X POST "${API_BASE_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d "${payload}")"
  token="$(printf '%s' "${response}" | node -e '
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
  if [[ -z "${token}" ]]; then
    echo "Login failed. Response:" >&2
    echo "${response}" >&2
    return 1
  fi
  printf '%s' "${token}"
}

echo "1) Creating baseline DB backup"
BACKUP_OUTPUT="$("${ROOT_DIR}/scripts/backup-db.sh")"
printf '%s\n' "${BACKUP_OUTPUT}"
BACKUP_FILE="$(printf '%s\n' "${BACKUP_OUTPUT}" | sed -n 's/^Backup created: //p' | tail -n 1)"
if [[ -z "${BACKUP_FILE}" || ! -f "${BACKUP_FILE}" ]]; then
  echo "Could not resolve backup file path from backup output." >&2
  exit 1
fi

TOKEN="$(login_token)"
MARKER="restore-smoke-$(date +%s)"

echo "2) Creating marker trip: ${MARKER}"
CREATE_PAYLOAD="$(printf '{"name":"%s","notes":"created-by-backup-restore-smoke"}' "${MARKER}")"
CREATE_RESPONSE="$(curl -sS -X POST "${API_BASE_URL}/trips" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "${CREATE_PAYLOAD}")"

TRIP_ID="$(printf '%s' "${CREATE_RESPONSE}" | node -e '
let data = "";
process.stdin.on("data", (c) => data += c);
process.stdin.on("end", () => {
  try {
    const json = JSON.parse(data || "{}");
    process.stdout.write(json.id || "");
  } catch {
    process.stdout.write("");
  }
});
')"

if [[ -z "${TRIP_ID}" ]]; then
  echo "Trip creation failed. Response:" >&2
  echo "${CREATE_RESPONSE}" >&2
  exit 1
fi

echo "3) Verifying marker trip exists before restore"
LIST_BEFORE="$(curl -sS "${API_BASE_URL}/trips" -H "Authorization: Bearer ${TOKEN}")"
FOUND_BEFORE="$(printf '%s' "${LIST_BEFORE}" | node -e '
const marker = process.argv[1];
let data = "";
process.stdin.on("data", (c) => data += c);
process.stdin.on("end", () => {
  try {
    const json = JSON.parse(data || "{}");
    const found = Array.isArray(json.items) && json.items.some((item) => item.name === marker);
    process.stdout.write(found ? "yes" : "no");
  } catch {
    process.stdout.write("no");
  }
});
' "${MARKER}")"
if [[ "${FOUND_BEFORE}" != "yes" ]]; then
  echo "Marker trip not found before restore. Aborting." >&2
  exit 1
fi

echo "4) Restoring baseline backup"
"${ROOT_DIR}/scripts/restore-db.sh" "${BACKUP_FILE}" >/dev/null

TOKEN_AFTER="$(login_token)"
LIST_AFTER="$(curl -sS "${API_BASE_URL}/trips" -H "Authorization: Bearer ${TOKEN_AFTER}")"
FOUND_AFTER="$(printf '%s' "${LIST_AFTER}" | node -e '
const marker = process.argv[1];
let data = "";
process.stdin.on("data", (c) => data += c);
process.stdin.on("end", () => {
  try {
    const json = JSON.parse(data || "{}");
    const found = Array.isArray(json.items) && json.items.some((item) => item.name === marker);
    process.stdout.write(found ? "yes" : "no");
  } catch {
    process.stdout.write("no");
  }
});
' "${MARKER}")"

if [[ "${FOUND_AFTER}" == "yes" ]]; then
  echo "Restore failed: marker trip still exists after restore." >&2
  exit 1
fi

echo "Backup/restore smoke test passed."
