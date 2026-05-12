#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/../backend"

IMAGE="ecotag-backend"
CONTAINER="ecotag-backend"
PORT="${PORT:-8080}"
ENV_FILE="$BACKEND_DIR/.env"

start() {
  if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found."
    echo "Copy .env.example and fill in your OPENAI_API_KEY:"
    echo "  cp $BACKEND_DIR/.env.example $BACKEND_DIR/.env"
    exit 1
  fi

  if ! docker image inspect "$IMAGE" &>/dev/null; then
    echo "Building image $IMAGE..."
    docker build -t "$IMAGE" "$BACKEND_DIR"
  fi

  if docker ps -q --filter "name=^${CONTAINER}$" | grep -q .; then
    echo "Backend is already running (container: $CONTAINER)."
    exit 0
  fi

  docker rm -f "$CONTAINER" &>/dev/null || true

  echo "Starting backend on port $PORT..."
  docker run -d \
    --name "$CONTAINER" \
    --env-file "$ENV_FILE" \
    -p "${PORT}:8080" \
    "$IMAGE"
  echo "Done. Container: $CONTAINER"
}

stop() {
  if docker ps -q --filter "name=^${CONTAINER}$" | grep -q .; then
    echo "Stopping backend..."
    docker stop "$CONTAINER"
    docker rm "$CONTAINER"
    echo "Done."
  else
    echo "Backend is not running."
  fi
}

case "${1:-}" in
  START)   start ;;
  STOP)    stop ;;
  RESTART) stop; start ;;
  *)
    echo "Usage: $(basename "$0") START|STOP|RESTART"
    exit 1
    ;;
esac
