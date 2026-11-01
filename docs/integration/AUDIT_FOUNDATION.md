# Audit foundation integration

PR53 normally inherits PR42 authentication and PR40 frontend (which normally inherits PR39). Main is unchanged. Suggested foundation order: PR42, PR40, PR53. PR39 is an ancestor of PR40: its root check and functional React mount are retained in the richer shared entry, not rendered twice. Its history remains available and it needs no duplicate merge.

The initial PR53 event-object audit signature and object-hash payload were incompatible with real M1/M2 and complaint/M4 callers. All callers now append to one established M1/M2 SHA256 array payload format. A small event-object adapter retains PR53's own event/transaction API and returned event id. No audit table or hash history is rewritten. Explicit event timestamps are normalized to MySQL millisecond UTC strings before hashing. Existing deployed PR53-only object-format hashes, if any exist outside this repository/test environment, need an explicit migration review before deployment; none were observed or modified here.

The existing M1 users/RBAC routes remain. The audit list returns the existing filtered camelCase array when no pagination is requested; page/pageSize explicitly request PR53's bounded paginated snake_case response. Both are admin-only and parameterized. Verification uses one genuine helper and retains both firstInvalidId and brokenAtId compatibility fields on failure. Missing chain heads fail closed.

The genuine audit page is registered through the shared frontend account extension and is visible only to admins. No authentication stub or alternate audit chain is introduced. Tests preserve original PR53 endpoint/tamper tests, all M1 tests and new real-MySQL dual-call, rollback, timestamp, pagination, legacy hash compatibility and frontend authorization regression cases.

Standalone operational/CI branches still require these foundations to reach main. Do not copy the implementations into each feature branch or skip their failing tests. The combined CI candidate tests actual pinned owner commits. No production deployment or main merge is implied.
