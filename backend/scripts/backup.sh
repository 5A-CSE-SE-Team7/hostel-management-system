#!/usr/bin/env bash
# Daily backup of the configured database (HMS-NF-004).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
: "${DB_HOST:=127.0.0.1}" "${DB_PORT:=3306}" "${DB_USER:=hms}" "${DB_NAME:=hms}"
: "${BACKUP_DIR:=$REPO_ROOT/backups}" "${RETENTION_DAYS:=14}"
: "${DB_PASSWORD:?DB_PASSWORD must be set}"

if [[ ! "$DB_NAME" =~ ^[A-Za-z0-9_][A-Za-z0-9_-]{0,63}$ ]]; then
  echo 'DB_NAME must be a valid MySQL database name' >&2
  exit 2
fi
if [[ ! "$RETENTION_DAYS" =~ ^[1-9][0-9]*$ ]] || (( RETENTION_DAYS > 3650 )); then
  echo 'RETENTION_DAYS must be an integer between 1 and 3650' >&2
  exit 2
fi

umask 077
mkdir -p -- "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_$(date +%Y%m%d_%H%M%S).sql.gz"
TEMP_FILE="$(mktemp "$BACKUP_DIR/.${DB_NAME}_backup.XXXXXX")"
cleanup() { [[ -z "${TEMP_FILE:-}" ]] || rm -f -- "$TEMP_FILE"; }
trap cleanup EXIT

# Keep incomplete dumps hidden and publish the final backup atomically only on success.
MYSQL_PWD="$DB_PASSWORD" mysqldump \
  --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" \
  --single-transaction --routines --events "$DB_NAME" | gzip -c > "$TEMP_FILE"
mv -- "$TEMP_FILE" "$BACKUP_FILE"
TEMP_FILE=''

find "$BACKUP_DIR" -maxdepth 1 -type f -name "${DB_NAME}_*.sql.gz" \
  -mmin "+$((RETENTION_DAYS * 1440))" -delete
echo "Backup written: $BACKUP_FILE"
