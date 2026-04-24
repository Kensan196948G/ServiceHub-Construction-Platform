/**
 * k6 負荷テストスクリプト — ServiceHub Construction Platform
 *
 * 実行方法:
 *   k6 run --env BASE_URL=http://localhost:8000 k6_load.js
 *
 * CI 実行 (thresholds 適用):
 *   k6 run --out json=results.json k6_load.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

// カスタムメトリクス
const errorRate = new Rate("error_rate");
const loginDuration = new Trend("login_duration", true);
const projectListDuration = new Trend("project_list_duration", true);
const healthDuration = new Trend("health_duration", true);

// 負荷シナリオ設定
export const options = {
  scenarios: {
    health_check: {
      executor: "constant-vus",
      vus: 5,
      duration: "30s",
      exec: "healthScenario",
      tags: { scenario: "health" },
    },
    api_load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 20 }, // ramp-up
        { duration: "60s", target: 20 }, // steady
        { duration: "30s", target: 0 }, // ramp-down
      ],
      exec: "apiScenario",
      tags: { scenario: "api" },
    },
  },
  thresholds: {
    // エラー率 1% 未満
    error_rate: [{ threshold: "rate<0.01", abortOnFail: false }],
    // 全リクエスト p95 < 500ms
    http_req_duration: [
      { threshold: "p(95)<500", abortOnFail: false },
      { threshold: "p(99)<1000", abortOnFail: false },
    ],
    // ヘルスエンドポイント p95 < 50ms
    health_duration: [{ threshold: "p(95)<50", abortOnFail: false }],
    // 案件一覧 p95 < 300ms
    project_list_duration: [{ threshold: "p(95)<300", abortOnFail: false }],
    // HTTP 失敗率
    http_req_failed: [{ threshold: "rate<0.05", abortOnFail: false }],
  },
};

function login() {
  const payload = JSON.stringify({
    email: "admin@servicehub.example",
    password: "Admin1234!",
  });
  const params = { headers: { "Content-Type": "application/json" } };
  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/v1/auth/login`, payload, params);
  loginDuration.add(Date.now() - start);

  const ok = check(res, {
    "login status 200": (r) => r.status === 200,
    "login has token": (r) => {
      try {
        return r.json("data.access_token") !== undefined;
      } catch (_) {
        return false;
      }
    },
  });
  errorRate.add(!ok);

  if (!ok) return null;
  try {
    return res.json("data.access_token");
  } catch (_) {
    return null;
  }
}

export function healthScenario() {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/health/live`);
  healthDuration.add(Date.now() - start);

  const ok = check(res, {
    "health/live 200": (r) => r.status === 200,
  });
  errorRate.add(!ok);
  sleep(1);
}

export function apiScenario() {
  const token = login();
  if (!token) {
    sleep(2);
    return;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // 案件一覧
  {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/v1/projects/`, { headers });
    projectListDuration.add(Date.now() - start);
    const ok = check(res, { "projects list 200": (r) => r.status === 200 });
    errorRate.add(!ok);
  }

  sleep(1);

  // ヘルスエンドポイント
  {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/health/live`);
    healthDuration.add(Date.now() - start);
    const ok = check(res, { "health/live 200": (r) => r.status === 200 });
    errorRate.add(!ok);
  }

  sleep(1);

  // 原価レコード一覧 (project ID は固定しない — 404 も許容)
  http.get(`${BASE_URL}/api/v1/projects/`, { headers });

  sleep(2);
}
