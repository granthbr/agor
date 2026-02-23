#!/usr/bin/env bash
# Smoke test: poll a health endpoint until it returns HTTP 200 with "status": "ok"
#
# Usage: ./scripts/smoke-test.sh [URL] [TIMEOUT] [INTERVAL]
#   URL      - Health endpoint (default: http://localhost:3030/health)
#   TIMEOUT  - Max wait in seconds (default: 120)
#   INTERVAL - Poll interval in seconds (default: 5)

set -euo pipefail

URL="${1:-http://localhost:3030/health}"
TIMEOUT="${2:-120}"
INTERVAL="${3:-5}"

echo "Smoke test: polling $URL (timeout: ${TIMEOUT}s, interval: ${INTERVAL}s)"

elapsed=0
while [ "$elapsed" -lt "$TIMEOUT" ]; do
  HTTP_CODE=$(curl -s -o /tmp/smoke-test-body.txt -w '%{http_code}' "$URL" 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ]; then
    BODY=$(cat /tmp/smoke-test-body.txt)

    # Try python3, then jq, then grep for JSON parsing
    if command -v python3 &>/dev/null; then
      STATUS=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null || echo "")
    elif command -v jq &>/dev/null; then
      STATUS=$(echo "$BODY" | jq -r '.status' 2>/dev/null || echo "")
    else
      STATUS=$(echo "$BODY" | grep -o '"status"\s*:\s*"ok"' >/dev/null 2>&1 && echo "ok" || echo "")
    fi

    if [ "$STATUS" = "ok" ]; then
      echo "Health check passed (${elapsed}s elapsed)"
      rm -f /tmp/smoke-test-body.txt
      exit 0
    fi

    echo "  HTTP 200 but status='$STATUS' (expected 'ok'), retrying..."
  else
    echo "  HTTP $HTTP_CODE, retrying..."
  fi

  sleep "$INTERVAL"
  elapsed=$((elapsed + INTERVAL))
done

echo "ERROR: Health check failed after ${TIMEOUT}s"
echo "Last response (HTTP $HTTP_CODE):"
cat /tmp/smoke-test-body.txt 2>/dev/null || echo "(no response body)"
rm -f /tmp/smoke-test-body.txt
exit 1
