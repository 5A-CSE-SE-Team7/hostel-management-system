# HMS-NF-003 — availability monitoring

Aayaan Kamil / PES2UG24CS017; verified issue #28. Independent main-based branch.

Implemented semantic health probing, persistent observations, time-bucket report with unknown coverage, conservative duplicate handling, pre-announced maintenance exclusion and systemd service/timer deployment configuration. No change to the existing health endpoint was necessary: it already checks MySQL. Operational documentation identifies independent monitoring topology, process management, retention, failure alerting and maintenance policy.

Actual PASS: 3 automated tests (unknown gaps/failed duplicate, valid vs retroactive maintenance, real HTTP semantic health). One real observation of the existing local API returned 200/status ok at 2026-10-29T16:38:06.041Z, latency 55.55ms. Raw data/report are in docs/evidence. October sample coverage is 0.002240143369175627%; monthlyTargetVerified=false. This is not a month of uptime, production service measurement or an active deployed timer.

BLOCKED: complete monthly acceptance requires a real monitoring host/domain, installation and actual month-long observations. Owner actions are documented, not automated by changing unrelated system configuration. Main-based full application CI still depends on S03/M1/M2/S04; these monitor tests need only Node and a local test server. Full-month reliability is NOT claimed.
