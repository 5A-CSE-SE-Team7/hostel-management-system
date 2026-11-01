# HMS-F-011 — maintenance progress and resolution

Aayaan Kamil / PES2UG24CS017; verified issue #18, Aayaan721. Stacked base: feature/HMS-F-010-complaint-assignment.

Adds the assigned-maintenance dashboard, start-work/resolution controls and status API. The actual issue specifies assigned -> in_progress -> resolved; the old broad M3 starter's direct resolution/reopening behavior is not carried forward. Assigned maintenance or warden/admin can update; students and unassigned maintenance receive 403. Resolution details are mandatory and retained with resolved_at. Row locking serializes competing transitions, so two concurrent resolutions produce one 200 and one 409, with one resolution audit event.

PASS using bash scripts/validate-complaint-integration.sh with pinned genuine M1/M2 and S04 dependencies: 17 real backend tests, 18 frontend tests, production build, both zero-finding audits. Tests exercise role restrictions, invalid transitions, mandatory details, concurrent resolution and valid audit chain. No fake sessions or audit implementation were used. Remote CI and main integration remain pending; shared dependencies are documented in F009 verification.
