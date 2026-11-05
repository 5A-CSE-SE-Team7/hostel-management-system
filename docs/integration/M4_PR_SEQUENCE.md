# Existing M4 PR integration sequence

PR #52 (`feature/HMS-M4-sprint1-fees-visitors-leave`) is explicitly Sprint 1: issues #1/#2/#21/#23/#24/#35. PR #51 (`feature/HMS-M4-fees-visitors-leave`) contains the same fee/visitor/leave/notify implementations and adds reports/CSV (issue #25) and its existing full-module screens.

The technically determined sequence is **#52 before #51**, after genuine foundation prerequisites. #51 now normally merges #52, preserving both original authors, original `main` bases and histories. Do not merge #51 into #52 or copy its report feature into Sprint 1. Once #52 is accepted on main, #51's ancestry allows GitHub to show the additive difference instead of replaying a second independent Sprint 1 implementation. Do not squash/rebase away that ancestry without coordinating the dependent diff; no merge or retarget was performed by this repair.

Shared controllers, notification adapter and strict calendar validation are maintained once. Invalid JSON date types and impossible calendars produce structured400 errors rather than TypeError/SQL500. Required M1 imports fail visibly; absent auth is never silently ignored. Common Sprint 1 integration assertions remain in sprint1.test.js; admin.test.js adds the existing report assertions with an independent real-API fixture. No assertion was weakened to remove duplicate execution.

The legacy Fees.jsx in #51 used obsolete shared interfaces and overlaps issue #22, which is assigned to Aayaan. The handoff explicitly requires coordination here. The existing #48 owns the canonical student/warden fee UI and already covers all fee workflows against the real backend; #51 no longer ships a competing Fees.jsx. No #48 code was copied into #51. Its history preserves the former source. This implements the documented ownership boundary rather than discarding fee functionality.

#51 retains Visitors/Leave/Reports. Their thin m4-ui compatibility boundary delegates to #40's accessible kit; calls use the actual named API adapters. CSV has its distinct text/csv contract, standard JSON error handling and credentials. The shared JSON API client remains strict. The tested combined App explicitly mounts these real pages with student/warden/admin and report staff-only guards; no duplicate frontend entry is introduced.

#40/#42 supply the shell/authentication pages. The existing #43→#44→#45→#46 complaint stack and #48 fee UI retain their own scope. #41's committed isolated composition verifies these modules together with real M1/M2 sources and both M4 scopes. Shared-source prerequisites still need reviewed main integration for standalone branch checks; no stubs, skipped required checks, branch-protection changes or PR merges are a substitute.

A Sprint 1 storyboard is not the actual issue #35 video. The recording, full test-plan/demo/freeze submissions mentioned in broad PR descriptions retain their existing owners and are not claimed complete by this code integration.
