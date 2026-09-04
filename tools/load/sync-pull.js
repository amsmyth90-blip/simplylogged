/* global __ENV */

import exec from "k6/execution";
import http from "k6/http";
import { check } from "k6";

const tokens = (__ENV.DIARYDOCK_LOAD_ACCESS_TOKENS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
const rate = Number(__ENV.DIARYDOCK_LOAD_RATE ?? "10");
const duration = __ENV.DIARYDOCK_LOAD_DURATION ?? "5m";

if (!tokens.length) throw new Error("Provide access tokens for dedicated non-production load-test accounts.");
if (rate > tokens.length * 0.5) {
  throw new Error("The requested rate would exceed DiaryDock's per-account sync-read limit.");
}

export const options = {
  scenarios: {
    syncPull: {
      executor: "constant-arrival-rate",
      rate,
      timeUnit: "1s",
      duration,
      preAllocatedVUs: Math.max(10, Math.ceil(rate * 1.5)),
      maxVUs: Math.max(50, rate * 4),
    },
  },
  thresholds: {
    checks: ["rate>0.99"],
    http_req_duration: ["p(95)<750", "p(99)<1500"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function syncPullLoad() {
  const origin = (__ENV.DIARYDOCK_LOAD_ORIGIN ?? "http://127.0.0.1:3000").replace(/\/$/, "");
  const token = tokens[(exec.vu.idInTest - 1) % tokens.length];
  const response = http.get(`${origin}/api/sync/pull`, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "DiaryDock-load-verifier/1" },
    tags: { journey: "sync-pull" },
    timeout: "5s",
  });
  check(response, {
    "sync pull succeeds": (value) => value.status === 200,
    "sync response is bounded": (value) => value.body.length < 524_288,
    "request correlation is present": (value) => Boolean(value.headers["X-Request-Id"]),
  });
}
