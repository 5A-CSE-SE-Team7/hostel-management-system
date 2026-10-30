# Operations notes (HMS-NF-003, NF-004, SR-001)

## Deployment topology (reference)
Browser --HTTPS/TLS1.2+--> nginx (static React build + reverse proxy, `deploy/nginx.conf`) --HTTP localhost--> Node/Express (`NODE_ENV=production REQUIRE_HTTPS=true`, run under systemd or pm2) --> MySQL 8.

## Availability monitoring
`GET /api/health` returns `{status:"ok"}` (200) or 503 when the database is unreachable. Point an uptime monitor at it (e.g. every minute).
Monthly availability = observed uptime excluding announced maintenance / planned time. Record scheduled maintenance windows in advance.

## Backups and restore drill
- Schedule a daily cron job (example assumes `/opt/hms` is the checkout and `/etc/hms/backup.env` is readable only by the backup account): `0 2 * * * set -a; . /etc/hms/backup.env; set +a; BACKUP_DIR=/var/backups/hms RETENTION_DAYS=14 /opt/hms/backend/scripts/backup.sh >> /var/log/hms/backup.log 2>&1`. The environment file supplies `DB_PASSWORD` and may override `DB_HOST`, `DB_PORT`, `DB_USER`, and `DB_NAME`. Backups are gzip-compressed, written with private file permissions, and published only after `mysqldump` succeeds. Retention defaults to 14 days and is configurable with `RETENTION_DAYS`.
- For a restore drill, first create an isolated, empty database such as `hms_restore_drill` using an account authorized to create databases. Restore a known backup into it with explicit target confirmation: `DB_PASSWORD=... RESTORE_TARGET_DB=hms_restore_drill RESTORE_CONFIRM_DB=hms_restore_drill backend/scripts/restore.sh /var/backups/hms/hms_YYYYMMDD_HHMMSS.sql.gz`. The script validates the gzip archive and prints elapsed seconds. Keep the source database untouched during a drill.
- Start the API against the restored database, log in as the synthetic admin, then call `GET /api/admin/audit/verify` (or use *Verify integrity* on the Audit page). Record the backup timestamp, restore duration, and audit verification result; acceptance requires a duration of at most 1800 seconds and a valid audit chain.

## TLS evidence
`nmap --script ssl-enum-ciphers -p 443 <host>` or testssl.sh; expect only TLSv1.2/1.3. Plain HTTP on the API port returns 426 when `REQUIRE_HTTPS=true`.

## Load testing
`backend/scripts/loadtest.sh http://host:4000 500 30` is a quick smoke (autocannon against /api/health). The Test Plan calls for JMeter scenarios with authenticated sessions; keep those plans under `docs/perf/`.
