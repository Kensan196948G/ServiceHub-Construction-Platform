#!/usr/bin/env bash
# smoke-test.sh — Post-deploy smoke test for ServiceHub Construction Platform
# Usage: BASE_URL=https://staging.example.com ./scripts/smoke-test.sh
# Exit 0 = all checks passed, non-zero = at least one check failed.

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
ADMIN_EMAIL="${SMOKE_ADMIN_EMAIL:-admin@servicehub.example}"
ADMIN_PASSWORD="${SMOKE_ADMIN_PASSWORD:-Admin1234!}"

PASS=0
FAIL=0

check() {
  local name="$1"
  local status="$2"
  local expected="$3"
  if [ "$status" = "$expected" ]; then
    echo "[PASS] $name (HTTP $status)"
    PASS=$((PASS + 1))
  else
    echo "[FAIL] $name — expected HTTP $expected, got $status"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== ServiceHub Smoke Test ==="
echo "BASE_URL: $BASE_URL"
echo ""

# 1. Liveness probe
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health/live")
check "/health/live" "$STATUS" "200"

# 2. Readiness probe
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health/ready")
check "/health/ready" "$STATUS" "200"

# 3. Unauthenticated API returns 401
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/projects")
check "GET /api/v1/projects (no auth) → 401" "$STATUS" "401"

# 4. Login returns 200 with token
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
LOGIN_STATUS=$(echo "$LOGIN_RESPONSE" | tail -1)
LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | head -n -1)
check "POST /api/v1/auth/login" "$LOGIN_STATUS" "200"

# 5. Authenticated projects list
if [ "$LOGIN_STATUS" = "200" ]; then
  TOKEN=$(echo "$LOGIN_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null || true)
  if [ -n "$TOKEN" ]; then
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/projects" \
      -H "Authorization: Bearer $TOKEN")
    check "GET /api/v1/projects (with auth) → 200" "$STATUS" "200"
  else
    echo "[SKIP] Bearer token not found in login response"
    FAIL=$((FAIL + 1))
  fi
else
  echo "[SKIP] Authenticated projects test — login failed"
  FAIL=$((FAIL + 1))
fi

# 6. Dashboard KPI endpoint
if [ -n "${TOKEN:-}" ]; then
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/dashboard/kpi" \
    -H "Authorization: Bearer $TOKEN")
  check "GET /api/v1/dashboard/kpi (with auth) → 200" "$STATUS" "200"
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
