Title: feat(HMS-F-011): locked maintenance progress and resolution workflow
Head: feature/HMS-F-011-maintenance-resolution
Base: feature/HMS-F-010-complaint-assignment
Refs #18

Implements strict assigned/in-progress/resolved transitions, assigned-maintenance dashboard, mandatory resolution details and transactional auditing. Concurrent resolutions yield one success and one conflict. PASS: 17 genuine backend tests, 18 frontend tests, build and both clean audits in the reproducible M1/M2 fixture. See docs/verification/HMS-F-011.md. Keep draft pending upstream integration; reviewer aadi-basal-06. No teammate branches changed.
