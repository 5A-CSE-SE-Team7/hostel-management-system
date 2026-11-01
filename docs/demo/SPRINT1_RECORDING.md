# Sprint 1 recording

[sprint1.mp4](sprint1.mp4): **57.920 seconds**, 1920×1080, H.264,
yuv420p, silent, 909,519 bytes. Real Playwright Chromium capture against this
branch's Express/React/MySQL application. Synthetic accounts and dedicated database
only. No mock UI, speed changes, slides, or substituted screens. Password inputs
remain masked. MP4 encoding is the only transformation of the continuous capture.

- 0–8s: warden login and authenticated dashboard.
- 8–23s: select an available bed, allocate to the seeded student, show confirmation
  and updated occupancy.
- 23–41s: switch to student, submit electrical complaint, show identifier/tracking.
- 41–57.92s: switch to warden, select Maintenance One and high priority, assign,
  show persisted assigned status and staff name.

QA: inspected extracted frames across the recording and full-resolution workflow
screenshots; all required actions/confirmations visible, no black screens or major
rendering defects observed. ffprobe confirmed dimensions, codec and duration.
Full ffmpeg decode completed without errors. Static pauses intentionally allow
reading; no artificial freeze frames added. Human review of presentation remains
part of PR review.

## Reproduction

Use Node >=22.12, local MySQL 8 and Chromium. Install backend/frontend locked
dependencies. Install capture tools separately:

```sh
npm install --prefix work/browser-tools playwright @axe-core/playwright
PLAYWRIGHT_BROWSERS_PATH="$PWD/work/browsers" work/browser-tools/node_modules/.bin/playwright install ffmpeg
```

Create a **fresh, empty** database `hms_s1_completion_demo_test` accessible to the
configured local HMS database user. Never reset a real environment. Then:

```sh
DB_NAME=hms_s1_completion_demo_test npm run db:init --prefix backend
DB_NAME=hms_s1_completion_demo_test npm run db:seed --prefix backend
PLAYWRIGHT_BROWSERS_PATH="$PWD/work/browsers" DB_NAME=hms_s1_completion_demo_test node scripts/demo-sprint1.cjs
ffmpeg -i "$(cat work/sprint1-video-path.txt)" -c:v libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart -an docs/demo/sprint1.mp4
node scripts/check-sprint1-accessibility.mjs
```

`CHROMIUM_PATH` overrides `/usr/bin/chromium`; `HMS_BROWSER_TOOLS` overrides the
capture tool node_modules directory. Each recording requires a fresh database
because the real allocation and complaint actions persist data.
