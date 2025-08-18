#!/usr/bin/env bash
set -euo pipefail

# © 2025 Joe Pruskowski

PORT="${1:-${SERVER_PORT:-3001}}"

if [[ -z "$PORT" ]]; then
  echo "[kill-port] No port provided and SERVER_PORT is empty." >&2
  exit 1
fi

echo "[kill-port] Checking for listeners on :$PORT"
ATTEMPTS=0
MAX_ATTEMPTS=10
while true; do
  # Only kill LISTENing processes, not clients connected to the port
  PIDS=$(lsof -ti tcp:"$PORT" -sTCP:LISTEN || true)
  if [[ -z "$PIDS" ]]; then
    echo "[kill-port] No processes found on :$PORT"
    break
  fi

  echo "[kill-port] Attempt $((ATTEMPTS+1)) killing PIDs: $PIDS"
  kill $PIDS || true
  sleep 0.3

  LEFT=$(lsof -ti tcp:"$PORT" -sTCP:LISTEN || true)
  if [[ -n "$LEFT" ]]; then
    echo "[kill-port] Forcing kill -9 on: $LEFT"
    kill -9 $LEFT || true
    sleep 0.2
  fi

  if ! lsof -ti tcp:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "[kill-port] Port :$PORT is now free"
    break
  fi

  ATTEMPTS=$((ATTEMPTS+1))
  if [[ $ATTEMPTS -ge $MAX_ATTEMPTS ]]; then
    echo "[kill-port] ERROR: Could not free port :$PORT after $MAX_ATTEMPTS attempts" >&2
    exit 2
  fi
done


