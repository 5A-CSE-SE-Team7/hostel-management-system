#!/usr/bin/env bash
set -euo pipefail
root="$(mktemp -d /tmp/hms-combined.XXXXXX)"
server_pid=''
cleanup() { if [[ -n "$server_pid" ]]; then kill "$server_pid" 2>/dev/null || true; wait "$server_pid" 2>/dev/null || true; fi; rm -rf "$root"; }
trap cleanup EXIT
git checkout-index --all --prefix="$root/"
python scripts/ci/compose-integration.py "$root"
for component in backend frontend; do
  (cd "$root/$component" && npm ci --no-fund && npm audit --audit-level=high)
done
if ! node -e 'const auth=require(process.argv[1]);process.exit(Array.isArray(auth.STAFF)?0:2)' "$root/backend/src/middleware/auth.js"; then
  if [[ "${1:-}" != '--with-proposed-staff-export' ]]; then
    echo 'BLOCKED: actual PR #42 omits STAFF, required by genuine M2/M4 routes. See docs/integration/OWNER_FIXES.md. No teammate source was changed.'
    exit 2
  fi
  echo 'PROPOSAL-ONLY VALIDATION: append the documented STAFF export in /tmp; this is NOT an accepted teammate fix.'
  printf '\nmodule.exports.STAFF = ["warden", "admin"];\n' >> "$root/backend/src/middleware/auth.js"
fi
result=0
(cd "$root/backend" && NODE_ENV=test DB_NAME=hms_test node --test --test-concurrency=1 tests/*.test.js) || result=1
(cd "$root/backend" && DB_NAME=hms_test npm run db:seed)
NODE_ENV=test DB_NAME=hms_test node -e 'const fs=require("fs");const app=require(process.argv[1]+"/src/app").createApp();const server=require("http").createServer(app);server.listen(0,"127.0.0.1",()=>fs.writeFileSync(process.argv[2],String(server.address().port)));process.on("SIGTERM",()=>server.close(()=>process.exit(0)));' "$root/backend" "$root/port" > "$root/api.log" 2>&1 &
server_pid=$!
for attempt in {1..100}; do
  [[ -f "$root/port" ]] && break
  if ! kill -0 "$server_pid" 2>/dev/null; then cat "$root/api.log"; exit 1; fi
  sleep 0.1
done
[[ -f "$root/port" ]] || { cat "$root/api.log"; exit 1; }
port="$(cat "$root/port")"
(cd "$root/frontend" && HMS_API_BASE="http://127.0.0.1:$port" npm test) || result=1
(cd "$root/frontend" && npm run build) || result=1
exit "$result"
