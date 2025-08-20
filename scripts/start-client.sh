#!/usr/bin/env bash
# © 2025 Joe Pruskowski
set -euo pipefail

# Start the client dev server after freeing the target port.
# Usage:
#   CLIENT_PORT=5173 ./scripts/start-client.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SCRIPT_DIR}/.."
CLIENT_PORT="${CLIENT_PORT:-5173}"

echo "[start-client] Ensuring port ${CLIENT_PORT} is free..."
bash "${SCRIPT_DIR}/kill-port.sh" "${CLIENT_PORT}"

echo "[start-client] Starting Vite dev server on port ${CLIENT_PORT}..."
cd "${REPO_ROOT}"
# Pass through the chosen port to Vite
npm --workspace client run dev -- --port "${CLIENT_PORT}"


