#!/usr/bin/env bash
set -euo pipefail
root="$(mktemp -d /tmp/hms-performance.XXXXXX)"
perf_db="hms_perf_$$"
created=false
server_pid=''
cleanup() {
  if [[ -n "$server_pid" ]]; then kill "$server_pid" 2>/dev/null || true; wait "$server_pid" 2>/dev/null || true; fi
  if [[ "$created" == true ]]; then "${compose[@]}" exec -T db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -e "DROP DATABASE \`$1\`;"' _ "$perf_db"; fi
  rm -rf "$root"
}
trap cleanup EXIT
# Compose the current genuine team candidate from the reviewed CI snapshot.
# No temporary STAFF/date patches and no main merge.
ci_ref=86a570c07b814c0ff54d3ce0efad589ae13368aa
git_dir="$(git rev-parse --path-format=absolute --git-common-dir)"
repository="$(dirname "$git_dir")"
git archive "$ci_ref" | tar -x -C "$root"
(cd "$root" && GIT_DIR="$git_dir" python scripts/ci/compose-integration.py "$root")
git show HEAD:backend/scripts/loadtest.sh > "$root/backend/scripts/loadtest.sh"
cp backend/scripts/perf/prepare-fixture.cjs "$root/backend/scripts/perf/prepare-fixture.cjs"
compose=(env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock compose --project-directory "$repository" -f "$repository/docker-compose.yml")
"${compose[@]}" exec -T db mysqladmin ping -h 127.0.0.1 --silent
"${compose[@]}" exec -T db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -e "CREATE DATABASE \`$1\`; GRANT ALL PRIVILEGES ON \`$1\`.* TO \"$MYSQL_USER\"@\"%\";"' _ "$perf_db"
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
# Optional real health-probe evidence on this explicitly synthetic fixture.
if [[ -n "${HMS_MONITOR_EVIDENCE_DIR:-}" ]]; then
  mkdir -p "$HMS_MONITOR_EVIDENCE_DIR"
  node "$root/backend/scripts/monitoring/availability.mjs" probe --url="http://127.0.0.1:$port/api/health" --output="$HMS_MONITOR_EVIDENCE_DIR/fixture-health.ndjson"
fi
PERF_EMAIL=admin@hms.test PERF_PASSWORD=Hostel@123 bash "$root/backend/scripts/loadtest.sh" --representative "http://127.0.0.1:$port" docs/evidence/performance-local.json

if [[ -n "${HMS_MONITOR_EVIDENCE_DIR:-}" ]]; then
  kill "$server_pid"; wait "$server_pid" || true; server_pid=''
  if node "$root/backend/scripts/monitoring/availability.mjs" probe --url="http://127.0.0.1:$port/api/health" --output="$HMS_MONITOR_EVIDENCE_DIR/fixture-health.ndjson"; then
    echo 'FAIL: intentionally stopped fixture was reported healthy'; exit 1
  fi
  echo 'PASS: monitor detected the deliberately stopped synthetic fixture; not production downtime evidence.'
fi
