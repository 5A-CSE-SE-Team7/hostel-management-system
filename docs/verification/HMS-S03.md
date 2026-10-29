# HMS-S03 — frontend foundation

Owner: Aayaan Kamil, PES2UG24CS017. Base: 3fc386a14454f296eb6ba7af94bef979425fc86b.

Implements React entry point, BrowserRouter, dashboard, protected route outlet, role-filtered navigation, accessible fields/errors, alerts, badges and data table, responsive styles, API client and session context. Complaints, notifications and fees are explicitly pending integration pages, not completed features. Client route checks are presentation controls; M1 must authorize every server request.

## Requirements and integration

Sources: uploaded HMS SRS v1.0 sections 3.1, 5 (accessibility), SAD v1.0 sections 3.5 and 4.5; backlog HMS-S03. The uploaded ATM Software Test Plan is a structural reference only. No ATM requirements were used.

Proposed M1 integration contract (not a backend implementation):
- `GET /api/auth/me`: 200 `{user: {id, name, role}}`; 401 for anonymous sessions.
- `POST /api/auth/login`: `{email,password}`; after success reload the session rather than assume a role from the submitted identity.
- `POST /api/auth/logout`: successful response clears client state.
- Requests include cookies. Non-success errors preserve `{message,errorCode,details,requestId}`. Unexpected HTML is rejected.

The SAD specifies a login response `{userId,role,sessionStatus}` but does not specify session introspection. This client does not depend on a different login response shape. Confirm the proposed introspection endpoint with Aditya when M1 becomes available; change the adapter if needed. Missing services produce an explicit unavailable state, with no fallback identity or fabricated session.

Backlog issue #3 explicitly assigns this shared frontend work to Aayaan. Older section 6 groups skeleton pages under Aditya; individual assignment and PR_HANDOFF take precedence per the user's instruction. Authentication, fee backend and audit implementation remain untouched.

## Verification

Executed on Node 24.19.0, 2026-10-29:
- PASS: `cd frontend && npm test`: 9 interaction/API tests. Covers all four role menus, direct URL denial, anonymous redirect, login error and credential submission, missing service, API field errors, HTML fallback rejection, accessible field description and empty data.
- PASS: `cd frontend && npm run build`.
- BLOCKED: live login/logout/session integration: M1 routes and auth middleware absent on remote main.
- BLOCKED: baseline backend tests: imports absent teammate audit/auth modules. Not changed or represented as passing.
- NOT RUN: real browser/screen-reader/WCAG AA audit; component checks do not certify WCAG compliance.

Run locally with `cd frontend && npm ci && npm test && npm run build`; `npm run dev` proxies `/api` to port 4000. No frontend credentials or environment file are required.
