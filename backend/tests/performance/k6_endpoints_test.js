/**
 * k6 Endpoint Coverage Test — ServiceHub Construction Platform
 *
 * Covers all major API endpoint groups with realistic user flows.
 * Validates per-endpoint SLO targets independently.
 *
 * Run:
 *   k6 run --env BASE_URL=http://localhost:8000 k6_endpoints_test.js
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

const errorRate = new Rate("endpoint_error_rate");

// Per-endpoint duration metrics
const metrics = {
  health: new Trend("ep_health_ms", true),
  auth: new Trend("ep_auth_ms", true),
  projects: new Trend("ep_projects_ms", true),
  costs: new Trend("ep_costs_ms", true),
  safety: new Trend("ep_safety_ms", true),
  notifications: new Trend("ep_notifications_ms", true),
  users: new Trend("ep_users_ms", true),
};

export const options = {
  scenarios: {
    endpoint_coverage: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "20s", target: 10 },
        { duration: "60s", target: 20 },
        { duration: "20s", target: 0 },
      ],
    },
  },
  thresholds: {
    endpoint_error_rate: [{ threshold: "rate<0.02", abortOnFail: false }],
    http_req_duration: [{ threshold: "p(95)<1000", abortOnFail: false }],
    ep_health_ms: [{ threshold: "p(95)<100", abortOnFail: false }],
    ep_auth_ms: [{ threshold: "p(95)<500", abortOnFail: false }],
    ep_projects_ms: [{ threshold: "p(95)<800", abortOnFail: false }],
    ep_costs_ms: [{ threshold: "p(95)<1000", abortOnFail: false }],
    ep_safety_ms: [{ threshold: "p(95)<1000", abortOnFail: false }],
    ep_notifications_ms: [{ threshold: "p(95)<800", abortOnFail: false }],
    ep_users_ms: [{ threshold: "p(95)<500", abortOnFail: false }],
    http_req_failed: [{ threshold: "rate<0.05", abortOnFail: false }],
  },
};

function timed(metricTrend, fn) {
  const start = Date.now();
  const res = fn();
  metricTrend.add(Date.now() - start);
  return res;
}

function getAuthToken() {
  const res = timed(metrics.auth, () =>
    http.post(
      `${BASE_URL}/api/v1/auth/login`,
      JSON.stringify({ email: "admin@servicehub.example", password: "Admin1234!" }),
      { headers: { "Content-Type": "application/json" } }
    )
  );
  const ok = check(res, {
    "login 200": (r) => r.status === 200,
    "token exists": (r) => { try { return Boolean(r.json("data.access_token")); } catch (_) { return false; } },
  });
  errorRate.add(!ok);
  if (!ok) return null;
  try { return res.json("data.access_token"); }
  catch (_) { return null; }
}

export default function () {
  // 1. Health endpoints (no auth required)
  group("health", () => {
    const r1 = timed(metrics.health, () => http.get(`${BASE_URL}/health/live`));
    errorRate.add(!check(r1, { "/health/live 200": (r) => r.status === 200 }));

    const r2 = timed(metrics.health, () => http.get(`${BASE_URL}/health/ready`));
    errorRate.add(!check(r2, { "/health/ready 200": (r) => r.status === 200 }));
  });
  sleep(0.3);

  // 2. Auth flow
  const token = getAuthToken();
  if (!token) { sleep(2); return; }
  const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // 3. Projects
  group("projects", () => {
    const r = timed(metrics.projects, () => http.get(`${BASE_URL}/api/v1/projects/`, { headers: auth }));
    errorRate.add(!check(r, { "projects list not 5xx": (x) => x.status < 500 }));
  });
  sleep(0.3);

  // 4. Costs
  group("costs", () => {
    const r = timed(metrics.costs, () =>
      http.get(`${BASE_URL}/api/v1/costs/summary`, { headers: auth })
    );
    errorRate.add(!check(r, { "costs summary not 5xx": (x) => x.status < 500 }));
  });
  sleep(0.3);

  // 5. Safety checks list
  group("safety", () => {
    const r = timed(metrics.safety, () =>
      http.get(`${BASE_URL}/api/v1/safety-checks/`, { headers: auth })
    );
    errorRate.add(!check(r, { "safety list not 5xx": (x) => x.status < 500 }));
  });
  sleep(0.3);

  // 6. Notifications
  group("notifications", () => {
    const r = timed(metrics.notifications, () =>
      http.get(`${BASE_URL}/api/v1/notifications/`, { headers: auth })
    );
    errorRate.add(!check(r, { "notifications not 5xx": (x) => x.status < 500 }));
  });
  sleep(0.3);

  // 7. Users (admin-level; may return 403)
  group("users", () => {
    const r = timed(metrics.users, () =>
      http.get(`${BASE_URL}/api/v1/users/`, { headers: auth })
    );
    errorRate.add(!check(r, { "users not 5xx": (x) => x.status < 500 }));
  });

  sleep(1);
}
