#!/usr/bin/env bash
# Deploy the latest origin/main on the VPS: pull, build, restart, health check.
# Called over SSH by .github/workflows/deploy.yml. By hand, from the app directory:
#   bash deploy/scripts/deploy.sh
# The workflow runs a copy fetched from origin/main, so the pull below rewriting
# this file doesn't affect the running script.
# ponytail: migrations are not applied here (the database is Supabase Cloud). Run a new
# supabase/migrations/*.sql in the Supabase SQL editor before pushing code that needs it.
set -euo pipefail
cd "${1:-$(dirname "$0")/../..}"

echo "==> Pulling origin/main"
git pull --ff-only -q origin main

echo "==> Building image (the running app is untouched if this fails)"
docker compose build

echo "==> Restarting app"
docker compose up -d

for _ in $(seq 1 40); do
  if docker compose exec -T app wget -q --spider http://localhost:3000/ 2>/dev/null; then
    docker image prune -f > /dev/null
    echo "==> Ensuring test accounts"
    # Runs inside the app container (it already has the Supabase URL/key); only set TEST_* are passed.
    test_env=()
    for v in TEST_ADMIN_PASSWORD TEST_ACCOUNTANT_PASSWORD TEST_TEACHER_PASSWORD TEST_STUDENT_PASSWORD TEST_DOMAIN; do
      [[ -n "${!v:-}" ]] && test_env+=(-e "$v=${!v}")
    done
    docker compose exec -T "${test_env[@]}" app node --input-type=module < deploy/scripts/ensure-test-accounts.mjs \
      || echo "WARN: test accounts not ensured (see above)" >&2
    echo "==> Deployed $(git rev-parse --short HEAD)"
    exit 0
  fi
  sleep 3
done
echo "App did not come up. Last logs:" >&2
docker compose logs --tail=80 app >&2
exit 1
