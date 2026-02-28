#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

echo "1) Checking tracked forbidden secret files"
ENV_HITS="$(git ls-files | rg -n '(^|/)\.env($|\.|/)' | rg -v '\.env\.example$' || true)"
if [[ -n "${ENV_HITS}" ]]; then
  echo "Tracked .env file detected. Keep only .env.example in git." >&2
  exit 1
fi
if git ls-files | rg -n '\.(pem|key|p12|pfx|jks|keystore)$' >/dev/null 2>&1; then
  echo "Tracked private key/certificate file detected." >&2
  exit 1
fi

echo "2) Scanning for private key material signatures"
if rg -n --hidden --glob '!.git/**' --glob '!scripts/security-scan.sh' \
  '(BEGIN (RSA|EC|OPENSSH|DSA|PGP) PRIVATE KEY|AWS_SECRET_ACCESS_KEY|xox[baprs]-)' . >/dev/null 2>&1; then
  echo "Potential secret material signature found." >&2
  exit 1
fi

echo "Security scan passed."
