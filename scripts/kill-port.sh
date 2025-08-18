#!/usr/bin/env bash
set -euo pipefail

# © 2025 Joe Pruskowski

PORT="${1:-${SERVER_PORT:-3001}}"

if [[ -z "$PORT" ]]; then
  echo "[kill-port] No port provided and SERVER_PORT is empty." >&2
  exit 1
fi

echo "[kill-port] Checking for listeners on :$PORT"
PIDS=$(lsof -ti tcp:"$PORT" || true)
if [[ -n "$PIDS" ]]; then
  echo "[kill-port] Killing PIDs: $PIDS"
  # Try graceful first, then force
  kill $PIDS || true
  sleep 0.5
  if lsof -ti tcp:"$PORT" >/dev/null 2>&1; then
    echo "[kill-port] Forcing kill -9 on remaining PIDs"
    kill -9 $PIDS || true
    sleep 0.2
  fi
else
  echo "[kill-port] No processes found on :$PORT"
fi


