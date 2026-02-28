#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Create it from .env.example first." >&2
  exit 1
fi

set -a
source "${ENV_FILE}"
set +a

API_BASE_URL="${API_BASE_URL:-http://localhost/api}"

echo "1) Health checks"
curl -sS "${API_BASE_URL}/health" >/dev/null
curl -sS "${API_BASE_URL}/health/db" >/dev/null
echo "   OK"

if [[ -z "${ADMIN_EMAIL:-}" || -z "${ADMIN_PASSWORD:-}" ]]; then
  echo "2) Auth check skipped (set ADMIN_EMAIL and ADMIN_PASSWORD to enable)."
  exit 0
fi

echo "2) Auth and data checks"
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
  echo "Auth failed. Response:" >&2
  echo "${LOGIN_RESPONSE}" >&2
  exit 1
fi

curl -sS "${API_BASE_URL}/auth/me" -H "Authorization: Bearer ${TOKEN}" >/dev/null
curl -sS "${API_BASE_URL}/trips" -H "Authorization: Bearer ${TOKEN}" >/dev/null
echo "   OK"

