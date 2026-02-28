#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: scripts/cutover-run.sh <legacy_trips.json>" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMPORT_FILE="$1"
VERIFY_RESTORE="${VERIFY_RESTORE:-false}"

echo "== Travel Manager Cutover Runner =="
echo "Import file: ${IMPORT_FILE}"
echo "Restore verification: ${VERIFY_RESTORE}"

echo "1) Preflight checks"
"${ROOT_DIR}/scripts/cutover-preflight.sh" "${IMPORT_FILE}"

echo "2) Creating pre-cutover backup"
BACKUP_OUTPUT="$("${ROOT_DIR}/scripts/backup-db.sh")"
printf '%s\n' "${BACKUP_OUTPUT}"
BACKUP_FILE="$(printf '%s\n' "${BACKUP_OUTPUT}" | sed -n 's/^Backup created: //p' | tail -n 1)"
if [[ -z "${BACKUP_FILE}" || ! -f "${BACKUP_FILE}" ]]; then
  echo "Could not resolve backup path from backup output." >&2
  exit 1
fi

echo "3) Importing legacy payload"
"${ROOT_DIR}/scripts/cutover-import.sh" "${IMPORT_FILE}"

echo "4) Running smoke checks"
"${ROOT_DIR}/scripts/smoke-api.sh"

if [[ "${VERIFY_RESTORE}" == "true" ]]; then
  echo "5) Running backup/restore smoke verification"
  "${ROOT_DIR}/scripts/backup-restore-smoke.sh"
else
  echo "5) Skipping restore smoke verification (set VERIFY_RESTORE=true to enable)."
fi

echo "Cutover run completed."
echo "Pre-cutover backup snapshot: ${BACKUP_FILE}"
