#!/usr/bin/env bash
# Quick p90 / concurrency smoke (TC-Perf-01/02). Full runs should use JMeter per the Test Plan.
# Usage: ./loadtest.sh http://localhost:4000 [connections=500] [seconds=30]
set -euo pipefail
BASE="${1:-http://localhost:4000}"; C="${2:-500}"; D="${3:-30}"
npx --yes autocannon -c "$C" -d "$D" "$BASE/api/health"
