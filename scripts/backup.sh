#!/usr/bin/env bash
# Compose backup: root authenticates inside the container; no password enters host arguments.
# Related: scripts/restore.sh restores into an isolated database before manual promotion.
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077
mkdir -p backups
archive="backups/shipyard-$(date -u +%Y%m%dT%H%M%SZ)-$$.archive.gz"
trap 'rm -f "$archive.partial"' EXIT
docker compose exec -T mongo sh -c 'exec mongodump --username root --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db shipyard --archive --gzip' > "$archive.partial"
test -s "$archive.partial"
mv "$archive.partial" "$archive"
printf 'Backup saved: %s\n' "$archive"
