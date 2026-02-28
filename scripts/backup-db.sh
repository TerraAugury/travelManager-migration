#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
OUT_DIR="${ROOT_DIR}/backups"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Create it from .env.example first." >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT_FILE="${OUT_DIR}/travel_manager_${STAMP}.sql"

set -a
source "${ENV_FILE}"
set +a

docker compose -f "${ROOT_DIR}/infra/docker-compose.yml" --env-file "${ENV_FILE}" \
  exec -T db pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" > "${OUT_FILE}"

echo "Backup created: ${OUT_FILE}"

