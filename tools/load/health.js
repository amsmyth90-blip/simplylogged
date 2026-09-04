/* global __ENV */

import http from "k6/http";
import { check } from "k6";

const rate = Number(__ENV.DIARYDOCK_LOAD_RATE ?? "20");
const duration = __ENV.DIARYDOCK_LOAD_DURATION ?? "2m";

export const options = {
  scenarios: {
    readiness: {
      executor: "constant-arrival-rate",
      rate,
      timeUnit: "1s",
      duration,
      preAllocatedVUs: Math.max(10, Math.ceil(rate / 2)),
      maxVUs: Math.max(50, rate * 2),
    },
  },
  thresholds: {
    checks: ["rate>0.995"],
    http_req_duration: ["p(95)<500", "p(99)<1000"],
    http_req_failed: ["rate<0.005"],
  },
};

export default function healthLoad() {
  const origin = (__ENV.DIARYDOCK_LOAD_ORIGIN ?? "http://127.0.0.1:3000").replace(/\/$/, "");
  const response = http.get(`${origin}/api/health/ready`, {
    headers: { "User-Agent": "DiaryDock-load-verifier/1" },
    tags: { journey: "readiness" },
    timeout: "5s",
  });
  check(response, { "readiness is healthy": (value) => value.status === 200 });
}
