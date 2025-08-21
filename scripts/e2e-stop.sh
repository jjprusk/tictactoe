#!/usr/bin/env bash
set -euo pipefail

# Kill preview and server ports
./scripts/kill-port.sh 5173 || true
./scripts/kill-port.sh 3001 || true

echo "E2E stop: ports cleaned up"


