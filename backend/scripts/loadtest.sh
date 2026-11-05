#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
case "${1:-}" in
  --representative)
    shift
    PERF_BASE="${1:-http://127.0.0.1:4000}" node "$SCRIPT_DIR/perf/benchmark.mjs" "${2:?Specify output JSON}" ;;
  --authenticated)
    shift
    LOADTEST_BASE_URL="${1:-http://127.0.0.1:4000}" node "$SCRIPT_DIR/perf/authenticated-loadtest.mjs" "${2:?Specify output JSON}" ;;
  *)
    echo 'Usage: loadtest.sh --representative|--authenticated BASE_URL OUTPUT.json' >&2
    echo 'The former unauthenticated health-only load test does not verify HMS performance.' >&2
    exit 2 ;;
esac
