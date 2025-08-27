#!/usr/bin/env bash
set -euo pipefail

# © 2025 Joe Pruskowski

if [[ $# -lt 1 ]]; then
  echo "[kill-procs] Usage: $0 <pattern> [pattern ...]" >&2
  exit 1
fi

PATTERNS=("$@")

for PAT in "${PATTERNS[@]}"; do
  echo "[kill-procs] Killing processes matching: $PAT"
  # Try graceful first
  pkill -f "$PAT" || true
  sleep 0.2
  # Force kill remaining matches
  PIDS=$(pgrep -f "$PAT" || true)
  if [[ -n "$PIDS" ]]; then
    echo "[kill-procs] Forcing kill -9 on: $PIDS"
    kill -9 $PIDS || true
  fi
done

# Final log of survivors (if any)
for PAT in "${PATTERNS[@]}"; do
  LEFT=$(pgrep -f "$PAT" || true)
  if [[ -n "$LEFT" ]]; then
    echo "[kill-procs] WARNING: Some processes still running for pattern '$PAT': $LEFT" >&2
  fi
done
