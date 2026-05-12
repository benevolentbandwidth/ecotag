#!/usr/bin/env bash
set -euo pipefail

PORT=${PORT:-3001}

pids=$(lsof -ti tcp:"$PORT") || true

if [ -z "$pids" ]; then
  echo "No process found on port $PORT."
  exit 0
fi

echo "Stopping backend on port $PORT (PID $pids)..."
kill "$pids"
echo "Done."
