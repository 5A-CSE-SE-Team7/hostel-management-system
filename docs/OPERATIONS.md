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
