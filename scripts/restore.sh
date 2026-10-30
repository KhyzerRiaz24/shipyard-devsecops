#!/usr/bin/env bash
# Restore into a fresh isolated database, never over the live journal. Review docs/runbooks.md.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "$#" -ne 1 ] || [ ! -s "$1" ]; then printf 'Usage: bash scripts/restore.sh backups/FILE.archive.gz\n' >&2; exit 1; fi
restore_database="shipyard_restore_$(date -u +%Y%m%dT%H%M%SZ)_$$"
docker compose exec -T -e "RESTORE_DB=$restore_database" mongo sh -c 'exec mongorestore --username root --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --archive --gzip --nsInclude="shipyard.*" --nsFrom="shipyard.*" --nsTo="$RESTORE_DB.*"' < "$1"
printf 'Restored into isolated database: %s\n' "$restore_database"
docker compose exec -T -e "RESTORE_DB=$restore_database" mongo sh -c 'mongosh --quiet --username root --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "db.getSiblingDB(process.env.RESTORE_DB).releases.countDocuments({})"'
