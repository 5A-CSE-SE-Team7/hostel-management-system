# HMS-F-012 — complaint notifications

Aayaan Kamil / PES2UG24CS017; verified issue #19. Stacked base: feature/HMS-F-011-maintenance-resolution.

Assignment notifies the student and maintenance assignee; progress, resolution and priority changes notify the student. In-app notifications are persisted inside the originating mutation transaction, after its state update. Optional email runs only after commit. Read/list/count endpoints scope every operation to the session user, return 404 for another user's notification, and support bounded older-page navigation. The UI provides read/read-all controls and an unread navigation count refreshed on read and every minute.

Optional SMTP uses SMTP_HOST/PORT/USER/PASS/FROM from the existing config. Empty SMTP_HOST disables email while preserving in-app delivery. Port 465 uses implicit TLS; other ports require STARTTLS; TLS minimum 1.2 and certificate verification remain enabled. Do not commit credentials. The adapter performs an initial attempt plus three retries, recording sent/failed, without leaking SMTP error strings to logs. MySQL named locks serialize concurrent delivery of each notification. A crash after SMTP acceptance but before status persistence can cause a duplicate on recovery: email is at-least-once, not exactly-once.

Recovery: run ONE `cd backend && node scripts/deliver-notifications.js` worker after configuring SMTP. It processes up to 100 pending notifications; --retry-failed explicitly includes exhausted failures. Repeat as needed under a single scheduler. Existing in-app-only notifications will be eligible after SMTP is configured. This script is not claimed to be deployed or scheduled by this change.

Actual validation with the staged-source compatibility script, real pinned M1/M2/MySQL and patched S04 dependencies: PASS 21 backend tests, 21 frontend tests, build and both zero-finding dependency audits. Four notification tests cover lifecycle persistence, privacy, read counts, injected SMTP failure (four attempts, no rollback), successful retry, sent-state idempotence and a competing MySQL delivery lock. Three frontend tests exercise marking read/event refresh, unread badge/empty states and error recovery. No live external SMTP message was sent; transport injection is explicit and limited to the optional mail adapter.

Remote/main integration remains pending M1/M2/S03/S04 and the preceding feature stack. SMTP production delivery is NOT RUN. No teammate branch was overwritten. Existing M3 starter notify design was reviewed; its interfaces were adapted to the scoped feature stack rather than copied wholesale.

Compatibility follow-up: inspected M4 fee router imports notify(userId,type,message,ref). The adapter preserves that export and arbitrary fee/complaint reference types; no fee logic is implemented here. An additional genuine DB test checks the M4 call contract.

Latest-team follow-up: PR #42 appeared during implementation at fb7b11ceda2aa7793974b7ac6973ef3427307bdd. The integration fixture now uses its real auth router/middleware with genuine M2 auditing. Our routers use explicit roles and do not require its removed STAFF export. M2 inventory and M4 fee/profile/report routers still import STAFF from older M1; that separate shared contract conflict must be coordinated by their owners, not patched in this feature.
