#!/usr/bin/env bash
# Restore drill (HMS-NF-004: restore <= 30 minutes). Usage: restore.sh backups/hms_YYYYMMDD_HHMMSS.sql.gz
set -euo pipefail
: "${DB_HOST:=127.0.0.1}" "${DB_USER:=hms}" "${DB_NAME:=hms}"
START=$(date +%s)
gunzip -c "$1" | MYSQL_PWD="${DB_PASSWORD:?DB_PASSWORD must be set}" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME"
echo "Restore completed in $(( $(date +%s) - START ))s. Now run: GET /api/admin/audit/verify to confirm audit-chain integrity."
