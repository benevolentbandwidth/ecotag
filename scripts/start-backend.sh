#!/usr/bin/env bash
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../backend" && pwd)"

if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo "Error: $BACKEND_DIR/.env not found."
  echo "Copy .env.example and fill in your OPENAI_API_KEY:"
  echo "  cp $BACKEND_DIR/.env.example $BACKEND_DIR/.env"
  exit 1
fi

if [ ! -d "$BACKEND_DIR/node_modules" ]; then
  echo "Installing dependencies..."
  npm install --prefix "$BACKEND_DIR"
fi

cd "$BACKEND_DIR"
echo "Starting backend on port ${PORT:-3001}..."
exec node server.js
