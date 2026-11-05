# Remaining external acceptance evidence — 2026-11-05

Scope: issues #20, #30, #27, #29, #28, #37 and #34 only. No deployment or administrative sign-off is implied by a local test or this checklist.

## #20 — actual deployed TLS

Local child-server tests cover HTTP/spoofed proxy rejection, verified TLS1.2/1.3 handshakes, TLS1.0/1.1 refusal and HSTS. The reference nginx hostname/certificate paths are examples. No real deployment hostname, certificate or deployment access is supplied in this environment.

- [ ] Operator identifies the real hostname, TLS termination topology, configured trusted proxy and evidence owner.
- [ ] Capture dated `testssl.sh` or `nmap --script ssl-enum-ciphers -p 443 HOST` output, certificate hostname/chain validity and TLS1.0/1.1 refusal from outside the deployment. Do not use an insecure certificate bypass as verification.
- [ ] Verify the public HTTP redirect/API rejection, HTTPS HSTS and Secure session cookie, and absence of a publicly reachable cleartext API bypass. Redact cookie values.
- [ ] Attach actual output to the test summary/RTM and have the owner review it. Local self-signed certificates do not meet this gate.

## #30 — manual accessibility acceptance

Automated browser/axe scans are evidence for their stated pages, roles, viewports and engines only.

- [ ] Record tester/date, application commit, browser/OS and screen-reader version.
- [ ] For student, warden, maintenance and admin, perform keyboard-only navigation, skip link/tab order, visible focus, form/error recovery, table navigation and logout without a mouse or focus trap.
- [ ] Use an actual screen reader to check headings, labels, validation announcements, status updates and tables on each role's relevant pages. Record failures and retest fixes.
- [ ] Attach the completed findings and reviewer decision; do not sign off WCAG AA from axe alone.

## #29 — installed daily backup scheduling

The existing populated synthetic restore evidence verifies a two-second restore, 13 business-table counts and preserved audit hashes with a valid restored API chain. It does not prove that a scheduler is installed.

- [ ] Deployment owner installs the daily cron configuration from OPERATIONS.md on the actual backup host with a private credentials file, durable BACKUP_DIR, configured RETENTION_DAYS and named owner.
- [ ] Capture redacted installed scheduler configuration plus one real scheduled job's timestamp/exit status, resulting archive metadata and retention settings. Do not include credentials or database dumps in evidence.
- [ ] Restore a scheduled archive into an explicitly separate target; retain duration, business-table comparisons and authenticated audit verification. State database size and fixture/deployment limits.

## #28 — measured monthly availability

- [ ] Install the independent HTTPS health observer/service/timer on the real monitoring host and retain installation/status evidence.
- [ ] Collect actual observations over a complete calendar month; monitor outages remain UNKNOWN, not successful uptime.
- [ ] Report observation coverage and >=99.5% availability using only valid maintenance windows declared before work began; retain raw observations.

Existing short synthetic success/shutdown samples and `monthlyTargetVerified=false` remain valid monitor-behavior evidence only. There is no authentic way to produce the missing historical month during this run.

## Documentation and load-test merge gates

#27 requires the real approved 100-session run, all security/persistence postconditions and merged scope/evidence documentation. #37 requires the approved what/why/impact deviation and scope links merged. #34 permits documented exceptions: every planned TC must map to an actual result or explicit exception, with residual risks visible. A passing local result or an open documentation PR is not sufficient to close an issue whose required changes are still unmerged.
