Title: feat(HMS-F-012): durable complaint notifications and optional mail retries
Head: feature/HMS-F-012-complaint-notifications
Base: feature/HMS-F-011-maintenance-resolution
Refs #19

Persists lifecycle notifications transactionally, delivers optional TLS-protected email after commit with three retries, and provides scoped list/read/read-all/count endpoints, unread navigation badge and notification UI. Includes a recovery worker and per-notification MySQL delivery lock.

PASS: 21 real backend tests, 21 frontend tests, production build, both clean audits in the documented M1/M2/S04 compatibility fixture. Optional SMTP failure/retry uses an explicit transport double; no external delivery or production deployment is claimed. See docs/verification/HMS-F-012.md. Keep draft for integration review by aadi-basal-06.
