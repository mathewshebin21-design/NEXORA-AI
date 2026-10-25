#!/usr/bin/env bash
# Usage: PGURL=postgresql://postgres@localhost:5433 DB=nexora scripts/bootstrap_db.sh
set -euo pipefail
PGURL="${PGURL:-postgresql://postgres@localhost:5433}"
DB="${DB:-nexora}"
psql "$PGURL/postgres" -v ON_ERROR_STOP=1 -q -f "$(dirname "$0")/bootstrap_db.sql"
if ! psql "$PGURL/postgres" -tAc "SELECT 1 FROM pg_database WHERE datname='$DB'" | grep -q 1; then
  psql "$PGURL/postgres" -q -c "CREATE DATABASE $DB OWNER nexora_owner"
fi
psql "$PGURL/$DB" -q -c "REVOKE ALL ON SCHEMA public FROM PUBLIC; GRANT ALL ON SCHEMA public TO nexora_owner;"
echo "bootstrapped $DB"
