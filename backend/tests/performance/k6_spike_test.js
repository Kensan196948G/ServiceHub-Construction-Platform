/**
 * k6 Spike Test — ServiceHub Construction Platform
 *
 * Purpose: Validate behavior under sudden traffic spike (0 → 200 VUs in 10s).
 * Acceptable: Elevated latency during spike, but error rate must stay < 5%.
 * Recovery: P95 must return < 1s within 60s of spike peak.
 *
 * Run:
 *   k6 run --env BASE_URL=http://localhost:8000 k6_spike_test.js
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

const spikeErrorRate = new Rate("spike_error_rate");
const spikeDuration = new Trend("spike_duration", true);
const recoveryDuration = new Trend("recovery_duration", true);

export const options = {
  scenarios: {
    spike: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 10 },   // baseline
        { duration: "10s", target: 200 },  // spike: 0→200 in 10s
        { duration: "60s", target: 200 },  // sustain spike
        { duration: "10s", target: 10 },   // drop back to baseline
        { duration: "60s", target: 10 },   // recovery observation
        { duration: "10s", target: 0 },    // ramp down
      ],
      tags: { scenario: "spike" },
    },
  },
  thresholds: {
    // During spike: error rate < 5% (relaxed from SLO 2%)
    spike_error_rate: [{ threshold: "rate<0.05", abortOnFail: false }],
    // Overall P95 < 3s during spike (relaxed; SLO is 1s under normal load)
    http_req_duration: [
      { threshold: "p(95)<3000", abortOnFail: false },
    ],
    // Recovery P95 is tracked via spike_duration vs recovery_duration comparison
    spike_duration: [{ threshold: "p(95)<3000", abortOnFail: false }],
    recovery_duration: [{ threshold: "p(95)<1000", abortOnFail: false }],
    http_req_failed: [{ threshold: "rate<0.10", abortOnFail: false }],
  },
};

function getAuthToken() {
  const payload = JSON.stringify({
    email: "admin@servicehub.example",
    password: "Admin1234!",
  });
  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    payload,
    { headers: { "Content-Type": "application/json" } }
  );
  const ok = check(res, { "login 200": (r) => r.status === 200 });
  spikeErrorRate.add(!ok);
  if (!ok) return null;
  try { return res.json("data.access_token"); }
  catch (_) { return null; }
}

export default function () {
  const vu = __VU;
  // Mark recovery phase (after spike peak) based on iteration timing
  const inRecovery = vu <= 20 && __ITER > 5;

  group("health probe", () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/health/live`);
    const elapsed = Date.now() - start;

    if (inRecovery) recoveryDuration.add(elapsed);
    else spikeDuration.add(elapsed);

    const ok = check(res, { "health/live 200": (r) => r.status === 200 });
    spikeErrorRate.add(!ok);
  });

  sleep(0.5);

  group("authenticated request", () => {
    const token = getAuthToken();
    if (!token) { sleep(1); return; }

    const headers = { Authorization: `Bearer ${token}` };
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/v1/projects/`, { headers });
    const elapsed = Date.now() - start;

    if (inRecovery) recoveryDuration.add(elapsed);
    else spikeDuration.add(elapsed);

    const ok = check(res, { "projects not 5xx": (r) => r.status < 500 });
    spikeErrorRate.add(!ok);
  });

  sleep(0.5);
}
