#!/usr/bin/env bash
# Health smoke: ./loadtest.sh http://localhost:4000 [connections=500] [seconds=30]
# Authenticated VUs: ./loadtest.sh --authenticated [base_url] [results.json]
set -euo pipefail
if [[ "${1:-}" == '--authenticated' ]]; then
  shift
  LOADTEST_BASE_URL="${1:-http://127.0.0.1:4000}" \
    node "$(dirname "$0")/perf/authenticated-loadtest.mjs" "${2:-performance-results.json}"
  exit
fi
BASE="${1:-http://localhost:4000}"; C="${2:-500}"; D="${3:-30}"
npx --yes autocannon -c "$C" -d "$D" "$BASE/api/health"
