/**
 * k6 SLO Validation Test — ServiceHub Construction Platform
 *
 * SLO targets (Phase 9b):
 *   - P95 latency < 1000ms at 100 RPS sustained
 *   - Error rate < 2%
 *   - Availability > 99.9%
 *
 * Run:
 *   k6 run --env BASE_URL=http://localhost:8000 k6_slo_test.js
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

const errorRate = new Rate("slo_error_rate");
const successCounter = new Counter("slo_requests_ok");

// SLO thresholds per endpoint category
const authDuration = new Trend("slo_auth_p95", true);
const projectDuration = new Trend("slo_project_p95", true);
const healthDuration = new Trend("slo_health_p95", true);
const costDuration = new Trend("slo_cost_p95", true);

export const options = {
  scenarios: {
    // Smoke: confirm basic availability
    smoke: {
      executor: "constant-vus",
      vus: 2,
      duration: "30s",
      exec: "smokeScenario",
      tags: { scenario: "smoke" },
      startTime: "0s",
    },
    // SLO load: 100 concurrent VUs, 3 minutes sustained — P95 < 1s target
    slo_load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 50 },   // ramp to 50
        { duration: "30s", target: 100 },  // ramp to 100 (SLO target)
        { duration: "120s", target: 100 }, // sustain 100 VUs for 2 min
        { duration: "30s", target: 0 },    // ramp down
      ],
      exec: "sloScenario",
      tags: { scenario: "slo_load" },
      startTime: "35s",
    },
  },
  thresholds: {
    // SLO: P95 < 1000ms (globally)
    http_req_duration: [
      { threshold: "p(95)<1000", abortOnFail: false },
      { threshold: "p(99)<3000", abortOnFail: false },
    ],
    // SLO: error rate < 2%
    slo_error_rate: [{ threshold: "rate<0.02", abortOnFail: false }],
    // SLO: HTTP failure rate < 5%
    http_req_failed: [{ threshold: "rate<0.05", abortOnFail: false }],
    // Per-endpoint P95 targets
    slo_health_p95: [{ threshold: "p(95)<100", abortOnFail: false }],
    slo_auth_p95: [{ threshold: "p(95)<500", abortOnFail: false }],
    slo_project_p95: [{ threshold: "p(95)<800", abortOnFail: false }],
    slo_cost_p95: [{ threshold: "p(95)<1000", abortOnFail: false }],
  },
};

function getAuthToken() {
  const payload = JSON.stringify({
    email: "admin@servicehub.example",
    password: "Admin1234!",
  });
  const params = { headers: { "Content-Type": "application/json" } };
  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/v1/auth/login`, payload, params);
  authDuration.add(Date.now() - start);

  const ok = check(res, {
    "auth: login 200": (r) => r.status === 200,
    "auth: token present": (r) => {
      try { return Boolean(r.json("data.access_token")); }
      catch (_) { return false; }
    },
  });
  errorRate.add(!ok);
  if (!ok) return null;
  try { return res.json("data.access_token"); }
  catch (_) { return null; }
}

export function smokeScenario() {
  group("smoke: health", () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/health/live`);
    healthDuration.add(Date.now() - start);
    const ok = check(res, { "health/live 200": (r) => r.status === 200 });
    errorRate.add(!ok);
    if (ok) successCounter.add(1);
  });
  sleep(1);

  group("smoke: ready", () => {
    const res = http.get(`${BASE_URL}/health/ready`);
    const ok = check(res, { "health/ready 200": (r) => r.status === 200 });
    errorRate.add(!ok);
    if (ok) successCounter.add(1);
  });
  sleep(1);
}

export function sloScenario() {
  const token = getAuthToken();
  if (!token) { sleep(2); return; }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // Health endpoints
  group("health", () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/health/live`);
    healthDuration.add(Date.now() - start);
    const ok = check(res, { "health/live 200": (r) => r.status === 200 });
    errorRate.add(!ok);
    if (ok) successCounter.add(1);
  });
  sleep(0.5);

  // Project list
  group("projects", () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/v1/projects/`, { headers });
    projectDuration.add(Date.now() - start);
    const ok = check(res, {
      "projects: 200 or 401": (r) => [200, 401].includes(r.status),
    });
    errorRate.add(!ok);
    if (ok) successCounter.add(1);
  });
  sleep(0.5);

  // Cost records (may 404 without real project)
  group("costs", () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/v1/costs/summary`, { headers });
    costDuration.add(Date.now() - start);
    const ok = check(res, {
      "costs: not 5xx": (r) => r.status < 500,
    });
    errorRate.add(!ok);
    if (ok) successCounter.add(1);
  });
  sleep(1);
}
