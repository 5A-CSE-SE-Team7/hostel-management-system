#!/usr/bin/env bash
# Quick p90 / concurrency smoke (TC-Perf-01/02). Full runs should use JMeter per the Test Plan.
# Usage: ./loadtest.sh http://localhost:4000 [connections=500] [seconds=30]
set -euo pipefail
# Authenticated HMS-NF-001 workload; preserve the original health-only mode
# for existing HMS-NF-002 callers. See docs/verification/HMS-NF-001.md.
if [[ "${1:-}" == '--representative' ]]; then
  shift
  PERF_BASE="${1:-http://127.0.0.1:4000}" node "$(dirname "$0")/perf/benchmark.mjs" "${2:-performance-results.json}"
  exit
fi
BASE="${1:-http://localhost:4000}"; C="${2:-500}"; D="${3:-30}"
npx --yes autocannon -c "$C" -d "$D" "$BASE/api/health"
