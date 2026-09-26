#!/usr/bin/env bash
# One-shot copy of the Supabase Cloud database into the self-hosted stack.
# Run on the VPS after `docker compose up -d` has brought the stack up once
# (so GoTrue has created the auth schema).
#
#   export CLOUD_DB_URL='postgresql://postgres.<ref>:<db-password>@aws-0-<region>.pooler.supabase.com:5432/postgres'
#   export LOCAL_DB_PASSWORD='<POSTGRES_PASSWORD from supabase/docker/.env>'
#   deploy/scripts/migrate-from-cloud.sh
#
# CLOUD_DB_URL: Supabase dashboard -> Connect -> "Session pooler" string.
# Steps: dump cloud -> restore locally -> verify row counts -> apply repo
# migrations. Stops at the first error. Re-running against a non-empty target
# fails on duplicate keys rather than duplicating data.
set -euo pipefail

: "${CLOUD_DB_URL:?set CLOUD_DB_URL}"
: "${LOCAL_DB_PASSWORD:?set LOCAL_DB_PASSWORD}"
DB_CONTAINER="${DB_CONTAINER:-supabase-db}"
REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="${WORK:-/var/backups/gnosis/migration-$(date +%Y%m%d-%H%M%S)}"
LOCAL_URL="postgresql://supabase_admin:${LOCAL_DB_PASSWORD}@localhost:5432/postgres"
mkdir -p "$WORK"; chmod 700 "$WORK"

in_db() { docker exec -i "$DB_CONTAINER" "$@"; }
local_psql() { in_db psql "$LOCAL_URL" -v ON_ERROR_STOP=1 -q "$@"; }

echo "==> Dumping cloud database into $WORK"
# pg_dump runs inside the supabase-db container so its version matches (>=) the server.
in_db pg_dump "$CLOUD_DB_URL" --data-only -t auth.users -t auth.identities > "$WORK/auth_data.sql"
in_db pg_dump "$CLOUD_DB_URL" -n public --no-owner --no-privileges > "$WORK/public.sql"
sed -i 's/^CREATE SCHEMA public;/-- CREATE SCHEMA public;/' "$WORK/public.sql"
# Full safety copy of the cloud DB, in custom format, kept alongside.
in_db pg_dump "$CLOUD_DB_URL" -Fc -n public -n auth > "$WORK/cloud-full.dump"

echo "==> Restoring auth users"
local_psql < "$WORK/auth_data.sql"
echo "==> Restoring public schema + data"
local_psql < "$WORK/public.sql"

echo "==> Verifying row counts (cloud vs self-hosted)"
PSQL="docker exec -i $DB_CONTAINER psql" "$REPO_DIR/deploy/scripts/verify-counts.sh" "$CLOUD_DB_URL" "$LOCAL_URL" | tee "$WORK/verify.txt"

echo "==> Applying repo migrations"
for f in "$REPO_DIR"/supabase/migrations/*.sql; do
  echo "   $(basename "$f")"
  local_psql < "$f"
done

echo "==> Done. Dumps and verification report: $WORK"
echo "    Next: seed the admin account (deploy/README.md step 6)."
