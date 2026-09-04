/* global __ENV */

import exec from "k6/execution";
import http from "k6/http";
import { check } from "k6";

const tokens = (__ENV.DIARYDOCK_LOAD_ACCESS_TOKENS ?? "")
  .split(",").map((value) => value.trim()).filter(Boolean);
const rate = Number(__ENV.DIARYDOCK_LOAD_RATE ?? "1");
const duration = __ENV.DIARYDOCK_LOAD_DURATION ?? "5m";

if (!tokens.length) throw new Error("Provide tokens for dedicated non-production load-test accounts.");
if (!Number.isFinite(rate) || rate <= 0) throw new Error("Provide a positive finite load rate.");
if (rate > tokens.length * 0.25) {
  throw new Error("The requested rate would approach DiaryDock's per-account sync-write limit.");
}

export const options = {
  scenarios: {
    syncPush: {
      executor: "constant-arrival-rate",
      rate,
      timeUnit: "1s",
      duration,
      preAllocatedVUs: Math.max(10, Math.ceil(rate * 2)),
      maxVUs: Math.max(50, rate * 5),
    },
  },
  thresholds: {
    checks: ["rate>0.99"],
    http_req_duration: ["p(95)<1000", "p(99)<2000"],
    http_req_failed: ["rate<0.01"],
  },
};

function uuid() {
  const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.map((value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function responseBody(response) {
  try {
    return response.json();
  } catch {
    return null;
  }
}

export default function syncPushLoad() {
  const origin = (__ENV.DIARYDOCK_LOAD_ORIGIN ?? "http://127.0.0.1:3000").replace(/\/$/, "");
  const token = tokens[exec.scenario.iterationInTest % tokens.length];
  const recordId = uuid();
  const createKey = uuid();
  const deleteKey = uuid();
  const batchId = uuid();
  const request = {
    apiVersion: "2026-09-01",
    deviceId: uuid(),
    batchId,
    mutations: [
      {
        idempotencyKey: createKey,
        recordId,
        entityType: "reminder",
        operation: "UPSERT",
        expectedRevision: null,
        schemaVersion: 1,
        payload: {
          title: "Synthetic scale verification",
          group: "today",
          timeLabel: "Today",
          priority: "normal",
          origin: "USER_CREATED",
          reminderType: "custom",
          timeZone: "Europe/London",
        },
      },
      {
        idempotencyKey: deleteKey,
        recordId,
        entityType: "reminder",
        operation: "DELETE",
        expectedRevision: "1",
        schemaVersion: 1,
        payload: {},
      },
    ],
  };
  const response = http.post(`${origin}/api/sync/push`, JSON.stringify(request), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "DiaryDock-load-verifier/1",
    },
    tags: { journey: "sync-push" },
    timeout: "5s",
  });
  const body = responseBody(response);
  check(response, {
    "sync push succeeds": (value) => value.status === 200,
    "request correlation is present": (value) => Boolean(value.headers["X-Request-Id"]),
    "batch identity is preserved": () => body?.batchId === batchId,
    "create and cleanup are applied": () => body?.results?.length === 2
      && body.results[0]?.idempotencyKey === createKey
      && body.results[0]?.status === "APPLIED"
      && body.results[1]?.idempotencyKey === deleteKey
      && body.results[1]?.status === "APPLIED",
  });
}
