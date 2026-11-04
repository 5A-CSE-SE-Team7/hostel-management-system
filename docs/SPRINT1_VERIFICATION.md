# Sprint 1 completion verification

Executed against the completion branch based on main `03dacfec`:

| Command / check | Actual result |
|---|---|
| `bash scripts/verify-sprint1.sh` backend suite | 76 passed, 0 failed |
| Same script: real frontend/API/MySQL integration | 3 passed, 0 failed, including student reading leave-decision notification |
| Same script: frontend unit/component suite | 53 passed, 0 failed |
| Same script: frontend production build | PASS |
| Same script: backend and frontend dependency audits | Both zero vulnerabilities |
| `node --test tests/ci/*.test.mjs` | 14 passed, 0 failed |
| `scripts/check-sprint1-accessibility.mjs` | Chromium axe WCAG A/AA login/register, light/dark, validation states and 3px focus: PASS |
| `scripts/demo-sprint1.cjs` | Real browser login, allocation, complaint creation, staff assignment PASS |
| Chromium final MP4 playback | PASS: duration 57.92s, playback advanced, no media error |
| ffprobe / complete ffmpeg decode | 57.920 seconds, 1920×1080 H.264, decode without errors |

The backend tests include real MySQL hash inspection, transactions, allocation
concurrency, fee arithmetic, complaint assignment rules, visitors, leave decisions,
RBAC, audit integrity, and recipient-only persisted notification access. The new
notification API ignores supplied user IDs and always uses the session recipient.

Live SMTP remains UNVERIFIED: no authorized credentials/test recipient configured.
In-app notification delivery is independently verified through actual HTTP/MySQL
and the rendered student inbox. No live email delivery is claimed.

GitHub main's checks were green at inspection. Protected main requires
`Backend unit + integration tests` and `Frontend build`. Full bypass/admin settings
are not available through this connection. PR #44 still has no formal review.
Project automation failed because its token is unavailable; administrator steps
are in CI_AUTOMATION.md. The combined fixture initially rejected the new Sprint 1 inbox as Sprint 2 code
and overwrote current app files with archived snapshots. Its scope guard now permits
the Sprint 1 inbox and preserves current completion files. Both combined modes
passed locally: broader historical fixture 94 backend / 67 frontend / 9 live UI
tests; Sprint 1 fixture 76 backend / 53 frontend / 3 live UI tests. These fixture
results supplement, rather than replace, direct completion-branch tests.

See SPRINT1_RTM.md for all 19 Sprint 1 issue mappings. No SRS/SAD/STP source was
rewritten. No Sprint 2 PR was merged. Owner review/authorized integration and #4
Project verification are still required before claiming Sprint 1 closure.
