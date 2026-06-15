#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

HOST="${GRE_SIM_HOST:-127.0.0.1}"
PORT="${GRE_SIM_PORT:-4173}"

needs_build=0
if [[ ! -f "dist/index.html" ]]; then
  needs_build=1
elif find src public package.json package-lock.json tsconfig.json vite.config.ts index.html -newer dist/index.html -print -quit | grep -q .; then
  needs_build=1
fi

if [[ "$needs_build" -eq 1 ]]; then
  npm run build
fi

if command -v xdg-open >/dev/null 2>&1; then
  (
    sleep 2
    xdg-open "http://${HOST}:${PORT}" >/dev/null 2>&1 || true
  ) &
fi

exec npm run preview -- --host "$HOST" --port "$PORT"
