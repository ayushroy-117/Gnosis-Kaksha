# Self-hosting runbook: Supabase Cloud → VPS

Moves the database and auth for gnosiskaksha.cloud off the Supabase free tier
onto the project VPS. The app keeps `@supabase/supabase-js`; only the URL and keys
change. Every step below runs **on the VPS** as root unless it says otherwise.

What the app uses from Supabase: Postgres (via PostgREST) and Auth (GoTrue).
It does **not** use Storage, Realtime, or Edge Functions.

Network layout after this runbook:

```
internet ──443──> nginx ──> 127.0.0.1:3000  Next.js app (docker)
                                 │  docker network "supabase_default"
                                 └──> api-gw:8000 ──> auth / rest ──> db
Postgres, pooler, API gateway, Studio: bound to 127.0.0.1 only. Never public.
```

## 0. Prerequisites

- Docker ≥ 24 and Docker Compose ≥ 2.24 (`docker compose version`), needed for the `!override` tag
- Node 20 (only to run `gen-secrets.mjs`; `npx -y node@20` also works)
- Firewall: allow only 22, 80, 443. Docker-published ports **bypass ufw**, which is
  why every port below is bound to 127.0.0.1 explicitly.
- This repo checked out at `/opt/gnosis/gnosis-kaksha` (adjust paths if elsewhere)

## 1. Get Supabase's official self-hosting files (pinned)

```bash
mkdir -p /opt/supabase-src && cd /opt/supabase-src
git clone --filter=blob:none https://github.com/supabase/supabase . && git checkout 564eab8ad7840b13324f68b1bfac074ef8d51c21
cp -r docker /opt/supabase && cd /opt/supabase
cp .env.example .env
cp /opt/gnosis/gnosis-kaksha/deploy/supabase/docker-compose.override.yml .
```

## 2. Fresh secrets (never reuse the cloud project's keys)

```bash
node /opt/gnosis/gnosis-kaksha/deploy/scripts/gen-secrets.mjs > /root/gnosis-secrets.env
chmod 600 /root/gnosis-secrets.env
```

Copy each `KEY=value` from that file over the matching line in `/opt/supabase/.env`.
Then set these in the same `.env`:

| Variable | Value |
|---|---|
| `SITE_URL` | `https://gnosiskaksha.cloud` |
| `SUPABASE_PUBLIC_URL` / `API_EXTERNAL_URL` | `http://127.0.0.1:8000` / `http://127.0.0.1:8000/auth/v1` (not public) |
| `DISABLE_SIGNUP` | `true` (accounts are only created server-side by the app) |
| `ENABLE_EMAIL_AUTOCONFIRM` | `true` (no SMTP configured; the app creates confirmed users) |
| `POOLER_TENANT_ID` | `gnosis` |
| `DASHBOARD_USERNAME` | anything other than `supabase` |

Leave `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` and `JWT_KEYS` empty; the app uses
the legacy `ANON_KEY`/`SERVICE_ROLE_KEY` pair.

## 3. Start the stack

```bash
cd /opt/supabase && docker compose pull && docker compose up -d
docker compose ps          # all services healthy after ~1 min
ss -ltnp | grep -E ':(5432|6543|8000)\b'   # every line must show 127.0.0.1, never 0.0.0.0
```

Memory: the full stack idles around 2–3 GB. If RAM is tight on the 8 GB box you can stop
the services this app never calls: `docker compose stop realtime storage imgproxy functions`.

## 4. Copy the data and verify it

Get the cloud connection string from the Supabase dashboard: **Connect → Session pooler**.
If you don't know the DB password, reset it there. That doesn't change the API keys and
doesn't affect the running site.

```bash
cd /opt/gnosis/gnosis-kaksha
read -rs CLOUD_DB_URL; export CLOUD_DB_URL
export LOCAL_DB_PASSWORD=$(grep ^POSTGRES_PASSWORD= /opt/supabase/.env | cut -d= -f2)
deploy/scripts/migrate-from-cloud.sh
```

The script dumps the cloud DB (a full custom-format copy is kept too), restores it,
**prints a per-table row-count comparison and exits non-zero on any mismatch**,
and only then applies `supabase/migrations/*.sql`. Don't continue unless it says
`OK: all row counts match.`

## 5. Point the app at the new instance

In `/opt/gnosis/gnosis-kaksha/.env` (from `.env.example`):

```ini
SUPABASE_URL=http://api-gw:8000
SUPABASE_ANON_KEY=<ANON_KEY from /opt/supabase/.env>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY from /opt/supabase/.env>
NEXT_PUBLIC_SITE_URL=https://gnosiskaksha.cloud
```

Remove any old `NEXT_PUBLIC_SUPABASE_*` lines. The browser no longer talks to Supabase.

```bash
docker compose up -d --build     # joins the supabase_default network
```

## 6. Seed the master admin (exactly once)

```bash
export SERVICE_ROLE_KEY=$(grep ^SERVICE_ROLE_KEY= /opt/supabase/.env | cut -d= -f2)
read -rs ADMIN_PASSWORD; export ADMIN_PASSWORD   # paste the password from the handover report
deploy/scripts/seed-admin.sh
unset ADMIN_PASSWORD
```

The database allows only one `admin` profile (unique index), and the script refuses
to run if one already exists.

## 7. Nginx + TLS

```bash
cp deploy/nginx/gnosiskaksha.cloud.conf /etc/nginx/sites-available/gnosiskaksha.cloud
ln -sf /etc/nginx/sites-available/gnosiskaksha.cloud /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d gnosiskaksha.cloud -d www.gnosiskaksha.cloud
```

If the site already has a vhost with a certificate, keep that file and only check that it
`proxy_pass`es to `http://127.0.0.1:3000`, and that port 3000 isn't reachable from outside
(`curl -m5 http://<public-ip>:3000` from your laptop should time out).

## 8. Nightly backups (you own these now)

```bash
( crontab -l 2>/dev/null; echo '15 2 * * * /opt/gnosis/gnosis-kaksha/deploy/scripts/backup.sh >> /var/log/gnosis-backup.log 2>&1' ) | crontab -
/opt/gnosis/gnosis-kaksha/deploy/scripts/backup.sh     # run once now, check it succeeds
```

Backups land in `/var/backups/gnosis` and are kept for 14 days. **They sit on the same disk
as the database.** Add an off-site copy (the `rclone` line in `backup.sh`) as soon as you
have a destination. Test a restore monthly:
`docker exec -i supabase-db pg_restore -U supabase_admin -d <scratch_db> --no-owner < <file>.dump`

## 9. Smoke test, then keep the cloud project as a fallback

Run the checklist in `deploy/SMOKE_TEST.md` against https://gnosiskaksha.cloud.

Leave the Supabase Cloud project **untouched for at least 7 days**. Don't pause or delete it.
Rollback: restore the old `.env` values and `docker compose up -d`. Any writes made on the
VPS since cutover would then need copying back by hand. After 7 clean days plus a
tested restore from a VPS backup, the cloud project can be paused.

## Studio access

`ssh -L 8000:127.0.0.1:8000 root@<vps>`, then open http://localhost:8000
(log in with `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD`).
