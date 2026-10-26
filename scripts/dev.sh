#!/usr/bin/env bash
# Local development: bootstrap PostgreSQL roles/DB, migrate, then run the API and web app.
#   PGURL=postgresql://postgres@localhost:5433 ./scripts/dev.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGURL="${PGURL:-postgresql://postgres@localhost:5433}"
HOSTPORT="${PGURL#*@}"
export NEXORA_OWNER_DATABASE_URL="${NEXORA_OWNER_DATABASE_URL:-postgresql+psycopg://nexora_owner:nexora_owner@$HOSTPORT/nexora}"
export NEXORA_DATABASE_URL="${NEXORA_DATABASE_URL:-postgresql+psycopg://nexora_app:nexora_app@$HOSTPORT/nexora}"
(cd "$ROOT/apps/api" && PGURL="$PGURL" ./scripts/bootstrap_db.sh && uv sync && uv run alembic upgrade head)
(cd "$ROOT/apps/api" && NEXORA_EMBEDDED_WORKER=true uv run uvicorn nexora.main:app --host 127.0.0.1 --port 8000) &
API_PID=$!
trap 'kill $API_PID 2>/dev/null' EXIT
(cd "$ROOT/apps/web" && npm install --no-audit --no-fund && npm run dev)
