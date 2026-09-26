#!/usr/bin/env bash
# Compare exact row counts per table between two Postgres databases.
# Usage: verify-counts.sh "<source-url>" "<target-url>"
# Exits non-zero if any table differs. Covers every table in `public` plus the
# auth tables that hold user accounts.
set -euo pipefail
SRC="$1"; DST="$2"
PSQL="${PSQL:-psql}"

count_sql=$(cat <<'SQL'
select format('select %L as t, count(*) from %I.%I', schemaname||'.'||relname, schemaname, relname)
from pg_stat_user_tables
where schemaname = 'public' or (schemaname = 'auth' and relname in ('users','identities'))
order by 1
SQL
)

counts() {
  local url="$1"
  $PSQL "$url" -Atc "$count_sql" | while read -r q; do $PSQL "$url" -AtF' ' -c "$q"; done | sort
}

src_counts=$(counts "$SRC")
dst_counts=$(counts "$DST")

status=0
printf '%-32s %10s %10s\n' TABLE SOURCE TARGET
while read -r t n; do
  m=$(awk -v t="$t" '$1==t{print $2}' <<<"$dst_counts")
  mark=""
  if [[ "$n" != "${m:-missing}" ]]; then mark="  <-- MISMATCH"; status=1; fi
  printf '%-32s %10s %10s%s\n' "$t" "$n" "${m:-missing}" "$mark"
done <<<"$src_counts"

if [[ $status -eq 0 ]]; then echo "OK: all row counts match."; else echo "FAIL: row counts differ."; fi
exit $status
