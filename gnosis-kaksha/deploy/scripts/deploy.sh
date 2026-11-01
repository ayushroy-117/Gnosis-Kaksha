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
    echo "==> Deployed $(git rev-parse --short HEAD)"
    exit 0
  fi
  sleep 3
done
echo "App did not come up. Last logs:" >&2
docker compose logs --tail=80 app >&2
exit 1
