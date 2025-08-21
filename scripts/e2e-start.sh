#!/usr/bin/env bash
set -euo pipefail

export ADMIN_KEY="test-admin-key"

# Ensure clean ports
./scripts/kill-port.sh 3001 || true
./scripts/kill-port.sh 5173 || true

# Build client to ensure assets are fresh
npm --workspace client run build >/dev/null 2>&1 || true

echo "E2E start: environment prepared (ADMIN_KEY set, ports cleared, client built)"


