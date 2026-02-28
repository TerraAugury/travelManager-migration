#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-status}"
LOCAL_PORT="${2:-80}"

require_tailscale() {
  if ! command -v tailscale >/dev/null 2>&1; then
    echo "tailscale CLI not found. Install Tailscale first." >&2
    exit 1
  fi
}

tailnet_url() {
  tailscale status --json 2>/dev/null | node -e '
let data = "";
process.stdin.on("data", (c) => data += c);
process.stdin.on("end", () => {
  try {
    const json = JSON.parse(data || "{}");
    const dns = String(json?.Self?.DNSName || "").replace(/\.$/, "");
    process.stdout.write(dns);
  } catch {
    process.stdout.write("");
  }
});
'
}

ensure_logged_in() {
  if ! tailscale status >/dev/null 2>&1; then
    echo "Tailscale is not connected. Run: tailscale up" >&2
    exit 1
  fi
}

usage() {
  cat <<EOF
Usage:
  scripts/tailscale-private-access.sh start [local_port]
  scripts/tailscale-private-access.sh stop
  scripts/tailscale-private-access.sh status

Examples:
  scripts/tailscale-private-access.sh start 80
  scripts/tailscale-private-access.sh stop
EOF
}

case "${ACTION}" in
  start)
    require_tailscale
    ensure_logged_in
    tailscale serve --bg "${LOCAL_PORT}"
    URL="$(tailnet_url)"
    echo "Tailscale private access enabled for localhost:${LOCAL_PORT}"
    if [[ -n "${URL}" ]]; then
      echo "Family URL: https://${URL}"
    fi
    tailscale serve status
    ;;
  stop)
    require_tailscale
    tailscale serve reset
    echo "Tailscale private access disabled."
    ;;
  status)
    require_tailscale
    URL="$(tailnet_url)"
    if [[ -n "${URL}" ]]; then
      echo "Tailnet host: https://${URL}"
    fi
    tailscale serve status
    ;;
  *)
    usage
    exit 1
    ;;
esac
