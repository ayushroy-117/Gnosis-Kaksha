#!/usr/bin/env bash
# Nightly logical backup of the self-hosted Supabase database.
# Cron (root):  15 2 * * * /opt/gnosis/gnosis-kaksha/deploy/scripts/backup.sh >> /var/log/gnosis-backup.log 2>&1
# Restore test: docker exec -i supabase-db pg_restore -U supabase_admin -d <scratch_db> --no-owner < file.dump
set -euo pipefail
DB_CONTAINER="${DB_CONTAINER:-supabase-db}"
DEST="${BACKUP_DIR:-/var/backups/gnosis}"
KEEP_DAYS="${KEEP_DAYS:-14}"
stamp=$(date +%Y%m%d-%H%M%S)
mkdir -p "$DEST"; chmod 700 "$DEST"

tmp="$DEST/.gk-$stamp.dump.partial"
docker exec "$DB_CONTAINER" pg_dump -U supabase_admin -d postgres -Fc -n public -n auth > "$tmp"
# Refuse to keep an empty/truncated dump.
docker exec -i "$DB_CONTAINER" pg_restore --list > /dev/null < "$tmp"
mv "$tmp" "$DEST/gk-$stamp.dump"
docker exec "$DB_CONTAINER" pg_dumpall -U supabase_admin --globals-only > "$DEST/gk-$stamp-globals.sql"

find "$DEST" -maxdepth 1 -name 'gk-*' -mtime +"$KEEP_DAYS" -delete
# Optional off-site copy (strongly recommended — same-disk backups die with the disk):
# rclone copy "$DEST/gk-$stamp.dump" remote:gnosis-backups/
echo "$(date -Is) backup ok: $DEST/gk-$stamp.dump ($(du -h "$DEST/gk-$stamp.dump" | cut -f1))"
