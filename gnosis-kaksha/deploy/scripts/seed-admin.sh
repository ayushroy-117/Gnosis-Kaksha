#!/usr/bin/env bash
# Creates THE master admin account (there can only ever be one — enforced by a
# unique index on profiles). Uses GoTrue's admin API so the password is hashed
# exactly like every other user's, then promotes the profile to 'admin'.
#
#   export SERVICE_ROLE_KEY=...            # from supabase/docker/.env
#   read -rs ADMIN_PASSWORD; export ADMIN_PASSWORD   # or leave unset to generate one
#   deploy/scripts/seed-admin.sh
#
# Env: AUTH_URL (default http://127.0.0.1:8000/auth/v1), ADMIN_EMAIL,
#      PSQL (default: docker exec -i supabase-db psql -U supabase_admin -d postgres)
# If the password is generated, it is printed ONCE to the terminal — store it in
# a password manager. It is never written to disk.
set -euo pipefail
: "${SERVICE_ROLE_KEY:?set SERVICE_ROLE_KEY}"
AUTH_URL="${AUTH_URL:-http://127.0.0.1:8000/auth/v1}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@gnosiskaksha.cloud}"
PSQL="${PSQL:-docker exec -i supabase-db psql -U supabase_admin -d postgres}"
generated=0
if [[ -z "${ADMIN_PASSWORD:-}" ]]; then
  ADMIN_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)"
  generated=1
fi

existing=$($PSQL -Atc "select count(*) from public.profiles where role = 'admin'")
if [[ "$existing" != "0" ]]; then
  echo "An admin account already exists — refusing to create another." >&2
  exit 1
fi

payload=$(ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" python3 -c '
import json, os
print(json.dumps({"email": os.environ["ADMIN_EMAIL"], "password": os.environ["ADMIN_PASSWORD"],
                  "email_confirm": True, "user_metadata": {"full_name": "Master Administrator"}}))')

resp=$(curl -sS -X POST "$AUTH_URL/admin/users" \
  -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" --data-binary @- <<<"$payload")
uid=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("id",""))' <<<"$resp")
if [[ -z "$uid" ]]; then echo "GoTrue refused: $resp" >&2; exit 1; fi

# The on_auth_user_created trigger made a 'student' profile; promote it.
$PSQL -v ON_ERROR_STOP=1 -qc "update public.profiles set role = 'admin', full_name = 'Master Administrator' where id = '$uid'"

echo "Admin account created: $ADMIN_EMAIL (id $uid)"
if [[ $generated -eq 1 ]]; then
  echo "Generated password (shown once, not saved anywhere): $ADMIN_PASSWORD"
fi
