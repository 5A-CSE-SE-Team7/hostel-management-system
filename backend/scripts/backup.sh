#!/usr/bin/env bash
# Daily backup of critical records (HMS-NF-004). Schedule with cron:  0 2 * * *  /opt/hms/backend/scripts/backup.sh
set -euo pipefail
: "${DB_HOST:=127.0.0.1}" "${DB_USER:=hms}" "${DB_NAME:=hms}" "${BACKUP_DIR:=./backups}" "${RETENTION_DAYS:=14}"
mkdir -p "$BACKUP_DIR"
F="$BACKUP_DIR/${DB_NAME}_$(date +%Y%m%d_%H%M%S).sql.gz"
MYSQL_PWD="${DB_PASSWORD:?DB_PASSWORD must be set}" mysqldump -h "$DB_HOST" -u "$DB_USER" --single-transaction --routines "$DB_NAME" | gzip > "$F"
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
echo "Backup written: $F"
