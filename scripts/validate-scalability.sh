#!/usr/bin/env bash
# Isolated, actual-branch workload; never run against production data.
set -euo pipefail
scratch="$(mktemp -d /tmp/hms-load.XXXXXX)"
load_db="hms_load_$$"
server_pid=''
docker_cmd=(docker --host=unix:///var/run/docker.sock)
cleanup(){ if [[ -n "$server_pid" ]];then kill "$server_pid" 2>/dev/null || true;wait "$server_pid" 2>/dev/null || true;fi; "${docker_cmd[@]}" exec hostel-management-system-db-1 mysql -uroot -proot_pass -e "DROP DATABASE IF EXISTS \`$load_db\`;";rm -rf "$scratch"; }
trap cleanup EXIT
"${docker_cmd[@]}" exec hostel-management-system-db-1 mysql -uroot -proot_pass -e "CREATE DATABASE \`$load_db\`; GRANT ALL ON \`$load_db\`.* TO 'hms'@'%';"
export NODE_ENV=test DB_NAME="$load_db"
npm run db:init --prefix backend
npm run db:seed --prefix backend
# Production-strength hash; test mode only relaxes the synthetic fixture rate limit.
node -e 'const b=require("./backend/node_modules/bcryptjs");const {pool}=require("./backend/src/db");b.hash("Hostel@123",12).then(hash=>pool.query("UPDATE users SET password_hash=? WHERE email=?",[hash,"admin@hms.test"])).finally(()=>pool.end());'
node -e 'const fs=require("fs");const app=require("./backend/src/app").createApp();const s=require("http").createServer(app);s.listen(0,"127.0.0.1",()=>fs.writeFileSync(process.argv[1],String(s.address().port)));process.on("SIGTERM",()=>s.close(()=>process.exit(0)));' "$scratch/port" > "$scratch/server.log" 2>&1 &
server_pid=$!
for attempt in {1..100};do [[ -f "$scratch/port" ]] && break;sleep 0.1;done
[[ -f "$scratch/port" ]] || { cat "$scratch/server.log";exit 1; }
mkdir -p docs/evidence
LOADTEST_RAMP_UP_SECONDS="${LOADTEST_RAMP_UP_SECONDS:-180}" LOADTEST_VUS=500 LOADTEST_DURATION_SECONDS=30 PERF_EMAIL=admin@hms.test PERF_PASSWORD=Hostel@123 LOADTEST_BASE_URL="http://127.0.0.1:$(cat "$scratch/port")" node backend/scripts/perf/authenticated-loadtest.mjs docs/evidence/scalability-local.json
