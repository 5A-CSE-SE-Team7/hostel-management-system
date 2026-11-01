#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
[[ "${DB_NAME:-hms_test}" == hms_test ]] || { echo 'Only isolated hms_test is allowed'; exit 1; }
export NODE_ENV=test DB_NAME=hms_test
scratch="$(mktemp -d /tmp/hms-sprint1.XXXXXX)"
server_pid=''
cleanup(){ if [[ -n "$server_pid" ]]; then kill "$server_pid" 2>/dev/null || true; wait "$server_pid" 2>/dev/null || true; fi; rm -rf "$scratch"; }
trap cleanup EXIT
npm test --prefix backend
(cd backend && node -e 'const h=require("./tests/helpers");h.resetDb().finally(h.closeAll).catch(e=>{console.error(e);process.exitCode=1;});')
npm run db:seed --prefix backend
node -e 'const fs=require("fs");const app=require("./backend/src/app").createApp();const s=require("http").createServer(app);s.listen(0,"127.0.0.1",()=>fs.writeFileSync(process.argv[1],String(s.address().port)));process.on("SIGTERM",()=>s.close(()=>process.exit(0)));' "$scratch/port" > "$scratch/api.log" 2>&1 &
server_pid=$!
for attempt in {1..100};do [[ -f "$scratch/port" ]] && break; if ! kill -0 "$server_pid" 2>/dev/null;then cat "$scratch/api.log";exit 1;fi;sleep 0.1;done
[[ -f "$scratch/port" ]] || { cat "$scratch/api.log";exit 1; }
HMS_API_BASE="http://127.0.0.1:$(cat "$scratch/port")" npm run test:integration --prefix frontend
npm test --prefix frontend
npm run build --prefix frontend
npm audit --prefix backend --audit-level=high
npm audit --prefix frontend --audit-level=high
