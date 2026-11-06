#!/usr/bin/env bash
# Makes sure the permanent test logins exist, are active and have the passwords set in
# the app's .env. Runs at the end of every deploy (deploy.sh); safe to run by hand:
#   bash deploy/scripts/ensure-test-accounts.sh
#
# Reads each value from the environment (GitHub secrets via deploy.yml), else the app's .env:
#   SUPABASE_SERVICE_ROLE_KEY
#   TEST_ADMIN_PASSWORD TEST_ACCOUNTANT_PASSWORD TEST_TEACHER_PASSWORD TEST_STUDENT_PASSWORD
#   TEST_DOMAIN (optional, default gnosiskaksha.in)
# A role whose password is unset is skipped. Passwords are never printed.
#
# Logins: test.accountant@ / test.teacher@ / test.student@<TEST_DOMAIN>.
# Admin: the database allows exactly ONE admin, so the test admin IS the master admin —
# its password is (re)set to TEST_ADMIN_PASSWORD on every deploy. If no admin exists
# yet, test.admin@<TEST_DOMAIN> is created as the master admin.
set -euo pipefail
cd "$(dirname "$0")/../.."

# Value from the environment (deploy.yml passes the TEST_* GitHub secrets) first, else from .env.
envval() { [[ -n "${!1:-}" ]] && { echo "${!1}"; return; }; grep -E "^$1=" .env 2>/dev/null | tail -1 | cut -d= -f2- || true; }
SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY:-$(envval SUPABASE_SERVICE_ROLE_KEY)}"
: "${SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY missing from .env}"
DOMAIN="$(envval TEST_DOMAIN)"; DOMAIN="${DOMAIN:-gnosiskaksha.in}"
AUTH_URL="${AUTH_URL:-http://127.0.0.1:8000/auth/v1}"
PSQL="${PSQL:-docker exec -i supabase-db psql -U supabase_admin -d postgres}"

sql() { $PSQL -v ON_ERROR_STOP=1 -Atqc "$1"; }

# gotrue METHOD PATH EMAIL PASSWORD NAME -> prints the user id
gotrue() {
  local payload resp uid
  payload=$(E="$3" P="$4" N="$5" python3 -c '
import json, os
print(json.dumps({"email": os.environ["E"], "password": os.environ["P"], "email_confirm": True,
                  "ban_duration": "none", "user_metadata": {"full_name": os.environ["N"]}}))')
  resp=$(curl -sS -X "$1" "$AUTH_URL/admin/users$2" \
    -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" --data-binary @- <<<"$payload")
  uid=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("id",""))' <<<"$resp")
  [[ -n "$uid" ]] || { echo "GoTrue refused ($3)" >&2; exit 1; }
  echo "$uid"
}

# upsert_user EMAIL PASSWORD NAME -> prints the user id (creates it, or resets its password)
upsert_user() {
  local uid
  uid=$(sql "select id from auth.users where email = '$1'")
  if [[ -n "$uid" ]]; then gotrue PUT "/$uid" "$1" "$2" "$3"; else gotrue POST "" "$1" "$2" "$3"; fi
}

# Same staff-code formula as the staff_profiles migration / staffCodeFor().
staff_row() {
  sql "insert into public.staff_details (user_id, staff_code)
       select p.id, 'GK-' || case p.role when 'teacher' then 'FAC' else upper(left(p.role, 3)) end
                    || '-' || upper(left(replace(p.id::text, '-', ''), 6))
       from public.profiles p where p.id = '$1'
       on conflict (user_id) do nothing"
}

branch=$(sql "select id from public.branches where is_active order by created_at limit 1")
[[ -n "$branch" ]] || { echo "No active branch — apply supabase/migrations first." >&2; exit 1; }

pw=$(envval TEST_ADMIN_PASSWORD)
if [[ -n "$pw" ]]; then
  admin=$(sql "select u.id || '|' || u.email from auth.users u join public.profiles p on p.id = u.id where p.role = 'admin'")
  if [[ -n "$admin" ]]; then
    gotrue PUT "/${admin%%|*}" "${admin#*|}" "$pw" "Master Administrator" >/dev/null
    email="${admin#*|}"
  else
    email="test.admin@$DOMAIN"
    uid=$(upsert_user "$email" "$pw" "Master Administrator")
    sql "update public.profiles set role = 'admin', full_name = 'Master Administrator', is_active = true where id = '$uid'"
  fi
  sql "update public.profiles set is_active = true where role = 'admin'"
  echo "  test login ok: admin      $email"
fi

for role in accountant teacher; do
  pw=$(envval "TEST_${role^^}_PASSWORD"); [[ -n "$pw" ]] || continue
  email="test.$role@$DOMAIN"; name="Test ${role^}"
  uid=$(upsert_user "$email" "$pw" "$name")
  sql "update public.profiles set role = '$role', full_name = '$name', is_active = true,
       branch_id = coalesce(branch_id, '$branch'), updated_at = now() where id = '$uid'"
  staff_row "$uid"
  sql "update public.staff_details set employment_status = 'active' where user_id = '$uid'"
  echo "  test login ok: $role $email"
done

pw=$(envval TEST_STUDENT_PASSWORD)
if [[ -n "$pw" ]]; then
  email="test.student@$DOMAIN"
  uid=$(upsert_user "$email" "$pw" "Test Student")
  sid=$(sql "select student_id from public.profiles where id = '$uid' and student_id is not null")
  if [[ -z "$sid" ]]; then
    # Already approved, so the dashboard isn't locked behind "Admission under review".
    sid=$(sql "insert into public.students (branch_id, full_name, class_number, board, subjects,
               parent_name, mobile, email, admission_date, status)
               values ('$branch', 'Test Student', 10, 'SEBA', array['Mathematics','Science','English'],
                       'Test Parent', '9000000000', '$email', current_date, 'active') returning id")
  fi
  sql "update public.students set status = 'active' where id = '$sid'"
  sql "update public.profiles set role = 'student', student_id = '$sid', full_name = 'Test Student',
       is_active = true, updated_at = now() where id = '$uid'"
  echo "  test login ok: student    $email ($(sql "select registration_number from public.students where id = '$sid'"))"
fi
