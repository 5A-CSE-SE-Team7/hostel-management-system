Title: feat(HMS-F-010): serialized complaint assignment and priority controls
Head: feature/HMS-F-010-complaint-assignment
Base: feature/HMS-F-009-complaint-submission
Refs #17

Adds real role-restricted assignment, active maintenance directory, independent priority updates, transactional auditing and accessible staff controls. Resolved assignments fail; reassignment preserves progress. See docs/verification/HMS-F-010.md.

PASS in the genuine M1/M2/MySQL compatibility fixture: 14 backend tests, 16 frontend tests, build and both zero-finding audits. Standalone upstream integration remains pending. Keep draft; review aadi-basal-06. No merges or teammate branch edits.
