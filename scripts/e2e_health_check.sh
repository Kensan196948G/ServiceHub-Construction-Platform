#!/bin/bash
# ServiceHub E2E ヘルスチェックスクリプト
BASE_URL="${1:-http://localhost:8888}"
PASS=0
FAIL=0
TOKEN=""

echo "======================================================"
echo " ServiceHub E2E Health Check - $BASE_URL"
echo "======================================================"

check() {
  local name="$1" url="$2" expected="$3"
  local response
  if [ -n "$TOKEN" ]; then
    response=$(curl -sf --max-time 5 -H "Authorization: Bearer $TOKEN" "$url" 2>/dev/null)
  else
    response=$(curl -sf --max-time 5 "$url" 2>/dev/null)
  fi
  if echo "$response" | grep -q "$expected"; then
    echo "  PASS: $name"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $name"
    echo "     Response: $(echo "$response" | head -c 150)"
    FAIL=$((FAIL + 1))
  fi
}

echo "[ System ]"
check "Health"      "$BASE_URL/health"       "healthy"
check "Status"      "$BASE_URL/api/v1/status" "ServiceHub"
check "Docs"        "$BASE_URL/docs"          "swagger"

echo "[ Auth ]"
LOGIN_RESP=$(curl -sf --max-time 5 -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin1234!"}' 2>/dev/null)
if echo "$LOGIN_RESP" | grep -q "access_token"; then
  echo "  PASS: Login"
  PASS=$((PASS + 1))
  TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
else
  echo "  FAIL: Login"; FAIL=$((FAIL + 1))
fi

echo "[ Modules ]"
check "Projects"    "$BASE_URL/api/v1/projects"           "data"
check "ITSM"        "$BASE_URL/api/v1/itsm/incidents"     "data"
check "Knowledge"   "$BASE_URL/api/v1/knowledge/articles" "data"

PR=$(curl -sf --max-time 5 -X POST "$BASE_URL/api/v1/projects" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"E2E Test","project_code":"E2E-999","status":"active","client_name":"Test","start_date":"2026-04-01","budget":0}' 2>/dev/null)
PID=$(echo "$PR" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)

if [ -n "$PID" ]; then
  check "DailyReports"  "$BASE_URL/api/v1/projects/$PID/daily-reports"  "data"
  check "Safety"        "$BASE_URL/api/v1/projects/$PID/safety-checks"  "data"
  check "CostSummary"   "$BASE_URL/api/v1/projects/$PID/cost-summary"   "data"
  curl -sf --max-time 5 -X DELETE "$BASE_URL/api/v1/projects/$PID" \
    -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1
fi

echo "======================================================"
echo " Results: PASS=$PASS  FAIL=$FAIL"
echo "======================================================"
[ $FAIL -eq 0 ] && exit 0 || exit 1
