Title: feat(HMS-F-009): audited student complaint submission and scoped tracking
Head: feature/HMS-F-009-complaint-submission
Base: feature/HMS-S03-react-frontend (stacked; retarget after #40 merges)
Issue: Refs #16
Draft: yes, pending main integration and CI

Implements complaint submission, active categories, field validation, authenticated actor ownership, atomic real-M2 audit integration and scoped tracking with bounded keyset pagination. The React page includes accessible fields, loading/empty/error/retry states, tracking and older-page navigation.

Validation: 10 real backend tests (7 complaint + 3 baseline), 14 frontend tests, production build and zero-vulnerability audits in an isolated compatibility fixture using pinned real M1/M2 code and S04 dependencies. Missing upstream modules are not stubbed. See docs/verification/HMS-F-009.md for exact reproducible steps and limits.

Depends on #40 source plus M1/M2 integration; main remains unchanged. Existing M3 starter branch is preserved. Assignment, resolution and notifications belong to separate task branches. Request review from aadi-basal-06; do not self-approve or merge.
