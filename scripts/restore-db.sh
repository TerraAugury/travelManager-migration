#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: scripts/restore-db.sh <backup.sql>" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
INPUT_FILE="$1"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Create it from .env.example first." >&2
  exit 1
fi

if [[ ! -f "${INPUT_FILE}" ]]; then
  echo "Backup file not found: ${INPUT_FILE}" >&2
  exit 1
fi

set -a
source "${ENV_FILE}"
set +a

docker compose -f "${ROOT_DIR}/infra/docker-compose.yml" --env-file "${ENV_FILE}" \
  exec -T db psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" < "${INPUT_FILE}"

echo "Restore completed from: ${INPUT_FILE}"

