# Operations notes (HMS-NF-003, NF-004, SR-001)

## Deployment topology (reference)
Browser --HTTPS/TLS1.2+--> nginx (static React build + reverse proxy, `deploy/nginx.conf`) --HTTP localhost--> Node/Express (`NODE_ENV=production REQUIRE_HTTPS=true`, run under systemd or pm2) --> MySQL 8.

## Availability monitoring
`GET /api/health` returns `{status:"ok"}` (200) or 503 when the database is unreachable. Point an uptime monitor at it (e.g. every minute).
Monthly availability = observed uptime excluding announced maintenance / planned time. Record scheduled maintenance windows in advance.

## Backups and restore drill
- Daily backup (cron): `0 2 * * *  DB_PASSWORD=... /opt/hms/backend/scripts/backup.sh` (gzip dump, 14-day retention by default).
- Restore drill: `DB_PASSWORD=... backend/scripts/restore.sh backups/hms_YYYYMMDD_HHMMSS.sql.gz` - note the printed duration (target <= 30 min).
- After restoring, log in as admin and call `GET /api/admin/audit/verify` (or press *Verify integrity* on the Audit page) to confirm the audit chain is intact.

## TLS evidence
`nmap --script ssl-enum-ciphers -p 443 <host>` or testssl.sh; expect only TLSv1.2/1.3. Plain HTTP on the API port returns 426 when `REQUIRE_HTTPS=true`.

## Load testing
`backend/scripts/loadtest.sh http://host:4000 500 30` is a quick smoke (autocannon against /api/health). The Test Plan calls for JMeter scenarios with authenticated sessions; keep those plans under `docs/perf/`.
