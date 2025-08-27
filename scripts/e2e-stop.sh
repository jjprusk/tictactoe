#!/usr/bin/env bash
set -euo pipefail

# Kill preview and server ports
./scripts/kill-port.sh 5173 || true
./scripts/kill-port.sh 3001 || true

# Kill any lingering dev/preview/node processes
./scripts/kill-procs.sh "node .*server/dist/index" "vite" "npm run preview" || true

echo "E2E stop: ports cleaned up"


