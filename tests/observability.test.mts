import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { emitServerEvent } from "../lib/observability/safe-event.ts";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("structured server events retain correlation but drop private fields", () => {
  const original = console.info;
  let captured = "";
  console.info = (value?: unknown) => { captured = String(value); };
  try {
    emitServerEvent("info", "test.request", {
      durationMs: 42,
      message: "private content",
      requestId: "request-1234567890",
      route: "/api/test",
      token: "secret",
      userId: "person",
    });
  } finally {
    console.info = original;
  }
  const event = JSON.parse(captured) as Record<string, unknown>;
  assert.equal(event.event, "test.request");
  assert.equal(event.requestId, "request-1234567890");
  assert.equal(event.durationMs, 42);
  assert.equal(event.message, undefined);
  assert.equal(event.token, undefined);
  assert.equal(event.userId, undefined);
  assert.throws(() => emitServerEvent("info", "INVALID EVENT"), /event name is invalid/);
});

test("Next instrumentation exports traces and reports errors without raw paths or messages", async () => {
  const source = await read("instrumentation.ts");
  assert.match(source, /registerOTel\(\{ serviceName: "diarydock-web" \}\)/);
  assert.match(source, /Instrumentation\.onRequestError/);
  assert.match(source, /context\.routePath/);
  assert.doesNotMatch(source, /request\.path|error\.message/);
});

test("request observations expose correlation and bounded low-cardinality measurements", async () => {
  const source = await read("lib/observability/request-observation.ts");
  assert.match(source, /X-Request-Id/);
  assert.match(source, /Server-Timing/);
  assert.match(source, /createHistogram\("diarydock\.request\.duration"/);
  assert.match(source, /createCounter\("diarydock\.request\.count"/);
  assert.doesNotMatch(source, /userId|accessToken|email|payload|cursor/);
});

test("health checks are bounded and never return dependency error details", async () => {
  const [live, ready] = await Promise.all([
    read("app/api/health/live/route.ts"),
    read("app/api/health/ready/route.ts"),
  ]);
  assert.match(live, /status: "ok"/);
  assert.match(ready, /AbortController/);
  assert.match(ready, /TIMEOUT_MS = 3_000/);
  assert.match(ready, /inspectProductionRuntimeEnvironment/);
  assert.match(ready, /status: "unavailable"/);
  assert.doesNotMatch(ready, /error\.message|String\(.*error/);
});

test("load workloads enforce latency, error and per-account safety gates", async () => {
  const [health, sync] = await Promise.all([
    read("tools/load/health.js"),
    read("tools/load/sync-pull.js"),
  ]);
  assert.match(health, /constant-arrival-rate/);
  assert.match(health, /p\(95\)<500/);
  assert.match(sync, /DIARYDOCK_LOAD_ACCESS_TOKENS/);
  assert.match(sync, /rate > tokens\.length \* 0\.5/);
  assert.match(sync, /p\(95\)<750/);
  assert.doesNotMatch(sync, /console\.|SharedArray/);
});
