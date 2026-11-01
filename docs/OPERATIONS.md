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

Use the explicit authenticated workload; health-only requests do not establish scalability. To run the authenticated 500-user scenario, start a dedicated local or staging API with the M1 authentication routes and a synthetic seeded account, then run:

```bash
cd backend
PERF_EMAIL=admin@hms.test PERF_PASSWORD='Hostel@123' \
LOADTEST_VUS=500 LOADTEST_DURATION_SECONDS=30 LOADTEST_RAMP_UP_SECONDS=30 \
bash scripts/loadtest.sh --authenticated http://127.0.0.1:4000 perf-results.json
```

Each virtual user logs in separately and keeps its own session cookie (use an admin/warden fixture for this workload) while cycling through session, profile, complaint, occupancy and fee-dues reads. Login attempts share one synthetic account; use `NODE_ENV=test` for the dedicated test server so its login limiter allows the full ramp. Do not enable test mode on production or expose this scenario to production data. The JSON report records attempted and successful logins, distinct sessions, authenticated request success rate, p90/max latency, and failures without storing credentials or response bodies. `DB_CONNECTION_LIMIT` controls the shared query/session pool (default 100); keep it below the MySQL server's available connection budget. A PASS requires all requested users to obtain unique sessions and zero failed authenticated requests.

## HMS-NF-003 sampled availability monitor

The observer validates HTTP 200 AND JSON status=ok, with a 3-second timeout and TLS verification. Public/non-loopback URLs must use HTTPS. It writes only UTC timestamp, semantic success, HTTP status and latency; no credentials or response payloads. Append to a persistent JSONL file, retain/rotate it under institutional retention policy, and alert on monitor/service failure as well as failed probes. A monitor outage creates UNKNOWN coverage, not successful uptime.

Prepared systemd units: deploy/monitoring/hms-health.service and hms-health.timer. On the real monitoring host, install the repository at /opt/hms, set the actual HTTPS domain in the service, confirm the Node binary path, copy units to /etc/systemd/system, run systemctl daemon-reload and enable --now hms-health.timer. DynamicUser/StateDirectory scope writes to /var/lib/hms-monitor. Inspect systemctl list-timers, journalctl -u hms-health.service, and observation output. These host-administration steps are documented, NOT claimed deployed in this cloud container. Prefer an independent host so application-host outages remain observable.

One-off development observation:
`node backend/scripts/monitoring/availability.mjs probe --url=http://127.0.0.1:4000/api/health --output=/tmp/hms-health.jsonl`

Monthly UTC report (use completed month's boundaries):
`node backend/scripts/monitoring/availability.mjs report --input=/var/lib/hms-monitor/observations.jsonl --start=2026-10-01T00:00:00Z --end=2026-11-01T00:00:00Z`

A sample estimates its one-minute bucket; this is sampled availability, not continuous proof. Missing buckets are UNKNOWN and reported separately. Any failed duplicate dominates successes, so retrying cannot erase failure. A monthly target is verified only for an ended complete UTC calendar month, complete eligible coverage and observed availability >=99.5%. Partial/future windows never establish monthly achievement. Archive raw observations with each report; do not overwrite or synthesize missing records.

Scheduled maintenance policy: record start/end/reason and declaredAt before work begins, obtain the team's ordinary maintenance authorization, and notify affected users. Report a JSON array of these windows via --maintenance=FILE. Retroactive or invalid exclusions are rejected. Overlapping/partial windows are unioned without double counting; exclude only their actual overlap. Unplanned downtime stays in the denominator. Changes to this policy require team review; do not edit evidence merely to meet the target.

Topology/process management: browser -> HTTPS nginx -> loopback Node API (systemd/pm2 under the existing deployment policy) -> MySQL. Monitor the public HTTPS health URL externally. Use the TLS branch's explicit proxy configuration. Document actual host, certificate renewal, API restart policy and monitor ownership when deployed. Current local evidence in docs/evidence is one observation only and explicitly does not establish 99.5% monthly availability.

