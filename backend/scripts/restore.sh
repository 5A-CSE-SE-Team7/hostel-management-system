#!/usr/bin/env bash
# Restore a database backup (HMS-NF-004: restore <= 30 minutes).
# Usage: RESTORE_TARGET_DB=hms_restore_drill RESTORE_CONFIRM_DB=hms_restore_drill restore.sh FILE.sql.gz
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo 'Usage: RESTORE_TARGET_DB=database RESTORE_CONFIRM_DB=database restore.sh FILE.sql.gz' >&2
  exit 2
fi
BACKUP_FILE="$1"
if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 2
fi
gzip -t -- "$BACKUP_FILE"

: "${DB_HOST:=127.0.0.1}" "${DB_PORT:=3306}" "${DB_USER:=hms}" "${DB_NAME:=hms}"
: "${RESTORE_TARGET_DB:=$DB_NAME}" "${DB_PASSWORD:?DB_PASSWORD must be set}"
if [[ ! "$RESTORE_TARGET_DB" =~ ^[A-Za-z0-9_][A-Za-z0-9_-]{0,63}$ ]]; then
  echo 'RESTORE_TARGET_DB must be a valid MySQL database name' >&2
  exit 2
fi
if [[ "${RESTORE_CONFIRM_DB:-}" != "$RESTORE_TARGET_DB" ]]; then
  echo 'Refusing restore: set RESTORE_CONFIRM_DB to exactly match RESTORE_TARGET_DB' >&2
  exit 2
fi

START="$(date +%s)"
gunzip -c -- "$BACKUP_FILE" | MYSQL_PWD="$DB_PASSWORD" mysql \
  --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" "$RESTORE_TARGET_DB"
ELAPSED="$(( $(date +%s) - START ))"
echo "Restore into $RESTORE_TARGET_DB completed in ${ELAPSED}s. Verify the audit chain with GET /api/admin/audit/verify."
