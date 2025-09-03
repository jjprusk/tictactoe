#!/usr/bin/env bash
set -euo pipefail

SERVER_PORT="${SERVER_PORT:-3001}"
CLIENT_PORT="${CLIENT_PORT:-5173}"

# Stop background PIDs if recorded
if [ -f /tmp/e2e-server.pid ]; then
  kill $(cat /tmp/e2e-server.pid) 2>/dev/null || true
  rm -f /tmp/e2e-server.pid
fi
if [ -f /tmp/e2e-client.pid ]; then
  kill $(cat /tmp/e2e-client.pid) 2>/dev/null || true
  rm -f /tmp/e2e-client.pid
fi

# Kill preview and server ports
./scripts/kill-port.sh "$CLIENT_PORT" || true
./scripts/kill-port.sh "$SERVER_PORT" || true

# Kill any lingering dev/preview/node processes
./scripts/kill-procs.sh "node .*server/dist/index" "vite" "npm run preview" || true

echo "E2E stop: ports cleaned up"

