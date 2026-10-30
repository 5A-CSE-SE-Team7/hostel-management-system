Title: feat(HMS-F-013U): student and warden fee ledger interfaces
Head: feature/HMS-F-013U-fee-frontend
Base: feature/HMS-S03-react-frontend
Refs #22

Adds student ledger/totals and staff dues, searchable student picker, assessment/payment forms, two-decimal display and field-level errors. Handles loading/empty/error/retry states and stale student-ledger requests. Uses verified M4 API; does not implement or modify fee backend.

PASS: 15 frontend tests and build, real M1/M2/M4 MySQL fee API contract test, both clean audits in the documented fixture. Ownership review by aadi-basal-06 is required because the original M4 branch also contains Fees.jsx. Keep draft pending coordination and upstream integration. Evidence: docs/verification/HMS-F-013U.md.
