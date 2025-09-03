#!/usr/bin/env bash
set -euo pipefail

# Environment for backend-enabled E2E
export ADMIN_KEY="test-admin-key"
export E2E_BACKEND=1
export SERVER_PORT="${SERVER_PORT:-3001}"
export CLIENT_PORT="${CLIENT_PORT:-5173}"

# Ensure clean ports
./scripts/kill-port.sh "$SERVER_PORT" || true
./scripts/kill-port.sh "$CLIENT_PORT" || true

# Kill any lingering dev/preview/node processes from previous runs
./scripts/kill-procs.sh "node .*server/dist/index" "vite" "npm run preview" || true

# Build server and client to ensure fresh assets
echo "[e2e-start] Building server..."
npm --workspace server run build >/dev/null 2>&1 || true
echo "[e2e-start] Building client..."
npm --workspace client run build >/dev/null 2>&1 || true

# Start server (non-interactive)
echo "[e2e-start] Starting server on :$SERVER_PORT..."
nohup env ADMIN_KEY="$ADMIN_KEY" SERVER_PORT="$SERVER_PORT" node server/dist/index.js > /tmp/e2e-server.log 2>&1 &
echo $! > /tmp/e2e-server.pid

# Start client preview (non-interactive)
echo "[e2e-start] Starting client preview on :$CLIENT_PORT..."
nohup npm --workspace client run preview -- --host 127.0.0.1 --port "$CLIENT_PORT" > /tmp/e2e-client.log 2>&1 &
echo $! > /tmp/e2e-client.pid

# Wait for both ports to be ready (fallback to curl if nc is unavailable)
echo "[e2e-start] Waiting for readiness..."
ready=0
for i in {1..60}; do
  if command -v nc >/dev/null 2>&1; then
    nc -z 127.0.0.1 "$SERVER_PORT" && nc -z 127.0.0.1 "$CLIENT_PORT" && ready=1 && break || true
  else
    curl -sf "http://127.0.0.1:$SERVER_PORT/healthz" >/dev/null 2>&1 && curl -sf "http://127.0.0.1:$CLIENT_PORT" >/dev/null 2>&1 && ready=1 && break || true
  fi
  sleep 1
done

if [ "$ready" -ne 1 ]; then
  echo "[e2e-start] ERROR: services failed to become ready" >&2
  exit 1
fi

echo "E2E start: server=http://127.0.0.1:$SERVER_PORT client=http://127.0.0.1:$CLIENT_PORT (ADMIN_KEY set)"

