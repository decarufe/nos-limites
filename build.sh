#!/usr/bin/env bash
set -euo pipefail

# build.sh — Run backend setup (install, migrate, seed) and start dev servers
# Usage: ./build.sh

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

echo "==> Running backend setup (server)"
pushd server >/dev/null
  echo "Installing server dependencies..."
  npm install

  echo "Running database migrations..."
  npm run db:migrate

  echo "Seeding database..."
  npm run db:seed

  echo "Starting server dev (background)..."
  npm run dev &
  SERVER_PID=$!
popd >/dev/null

trap 'echo "Stopping background processes..."; kill ${SERVER_PID:-} 2>/dev/null || true' EXIT

echo "==> Installing and starting frontend (client)"
pushd client >/dev/null
  echo "Installing client dependencies..."
  npm install

  echo "Starting client dev server (foreground)..."
  npm run dev
popd >/dev/null

# When the client dev server exits, the trap will stop the background server.
