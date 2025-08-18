#!/usr/bin/env bash
set -euo pipefail

# © 2025 Joe Pruskowski

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_DIR="$ROOT_DIR/server"

# Default port; allow override via env
: "${SERVER_PORT:=3001}"

echo "[start-server] Ensuring no process is bound to port ${SERVER_PORT}"
if lsof -iTCP -sTCP:LISTEN -n -P | grep -E ":${SERVER_PORT}\b" >/dev/null 2>&1; then
  PID_LIST=$(lsof -ti tcp:${SERVER_PORT} || true)
  if [ -n "$PID_LIST" ]; then
    echo "[start-server] Killing processes on port ${SERVER_PORT}: $PID_LIST"
    kill -9 $PID_LIST || true
    sleep 0.5
  fi
fi

echo "[start-server] Installing deps (skip if already installed)"
cd "$ROOT_DIR"
npm --workspace server install --ignore-scripts --no-audit --no-fund >/dev/null 2>&1 || true

echo "[start-server] Starting dev server on port ${SERVER_PORT}"
cd "$SERVER_DIR"
SERVER_PORT="$SERVER_PORT" npm run dev


