#!/usr/bin/env bash
set -euo pipefail
root="$(mktemp -d /tmp/hms-performance.XXXXXX)"
perf_db="hms_perf_$$"
created=false
server_pid=''
cleanup() {
  if [[ -n "$server_pid" ]]; then kill "$server_pid" 2>/dev/null || true; wait "$server_pid" 2>/dev/null || true; fi
  if [[ "$created" == true ]]; then docker compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -e "DROP DATABASE \`$1\`;"' _ "$perf_db"; fi
  rm -rf "$root"
}
trap cleanup EXIT
git checkout-index --all --prefix="$root/"
f012=40f6f07e512044fc2223a24fb6cb328772982605
m1=b14ab0bae2fd06d80cffff6232fd44c8d41b8ee4
m2=17ad39d1de05beef6fc23b511d64cd86635dd9bc
m4=ebff728868b13825dc0df6126debf2efebca234a
s04=e764dd26a93b71f581abf8abcc0feedff7036b86
mkdir -p "$root/backend/src/routes"
for file in src/routes/auth.js src/routes/profile.js src/middleware/auth.js; do git show "$m1:backend/$file" > "$root/backend/$file"; done
for file in src/routes/inventory.js src/routes/allocations.js src/utils/audit.js; do git show "$m2:backend/$file" > "$root/backend/$file"; done
for file in src/routes/fees.js src/routes/reports.js; do git show "$m4:backend/$file" > "$root/backend/$file"; done
for file in src/app.js src/routes/complaints.js src/routes/notifications.js src/utils/notify.js; do git show "$f012:backend/$file" > "$root/backend/$file"; done
for file in package.json package-lock.json; do git show "$s04:backend/$file" > "$root/backend/$file"; done
python - "$root/backend/src/app.js" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]);s=p.read_text()
for owner,name,mount in [('M1','auth','/api/auth'),('M1','profile','/api'),('M2','inventory','/api'),('M2','allocations','/api'),('M4','fees','/api'),('M4','reports','/api/reports')]:
 old=f"  // mounted by {owner} PR: app.use('{mount}', require('./routes/{name}'));"
 assert old in s
 s=s.replace(old,f"  app.use('{mount}', require('./routes/{name}'));")
p.write_text(s)
PY
docker compose up -d --wait
docker compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -e "CREATE DATABASE \`$1\`; GRANT ALL PRIVILEGES ON \`$1\`.* TO \"$MYSQL_USER\"@\"%\";"' _ "$perf_db"
created=true
(cd "$root/backend" && npm ci --no-fund && npm audit --audit-level=high && DB_NAME="$perf_db" npm run db:init && DB_NAME="$perf_db" npm run db:seed)
mkdir -p docs/evidence
DB_NAME="$perf_db" HMS_BACKEND_ROOT="$root/backend" node "$root/backend/scripts/perf/prepare-fixture.cjs" docs/evidence/performance-fixture.json
NODE_ENV=test DB_NAME="$perf_db" node -e 'const fs=require("fs"); const app=require(process.argv[1]+"/src/app").createApp(); const server=require("http").createServer(app); server.listen(0,"127.0.0.1",()=>fs.writeFileSync(process.argv[2],String(server.address().port))); process.on("SIGTERM",()=>server.close(()=>process.exit(0)));' "$root/backend" "$root/port" > "$root/server.log" 2>&1 &
server_pid=$!
for attempt in {1..100}; do
  [[ -f "$root/port" ]] && break
  if ! kill -0 "$server_pid" 2>/dev/null; then cat "$root/server.log"; exit 1; fi
  sleep 0.1
done
[[ -f "$root/port" ]] || { cat "$root/server.log"; exit 1; }
port="$(cat "$root/port")"
# Documented synthetic seed accounts only, never production credentials.
PERF_EMAIL=admin@hms.test PERF_PASSWORD=Hostel@123 bash "$root/backend/scripts/loadtest.sh" --representative "http://127.0.0.1:$port" docs/evidence/performance-local.json
