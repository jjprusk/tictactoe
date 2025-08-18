#!/usr/bin/env bash
set -euo pipefail

# © 2025 Joe Pruskowski

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_DIR="$ROOT_DIR/server"

# Default port; allow override via env
: "${SERVER_PORT:=3001}"

"$ROOT_DIR/scripts/kill-port.sh" "$SERVER_PORT"

echo "[start-server] Installing deps (skip if already installed)"
cd "$ROOT_DIR"
npm --workspace server install --ignore-scripts --no-audit --no-fund >/dev/null 2>&1 || true

echo "[start-server] Starting dev server on port ${SERVER_PORT}"
cd "$SERVER_DIR"
SERVER_PORT="$SERVER_PORT" npm run dev


