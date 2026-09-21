import assert from "node:assert/strict";
import test from "node:test";

import {
  checkDistributedRateLimit,
  distributedRateLimitReady,
  inspectDistributedRateLimitConfiguration,
  selectServerRateLimitBackend,
  toDistributedRateLimitResult,
} from "../lib/distributed-rate-limit.ts";

test("distributed rate limit configuration is complete or rejected", () => {
  assert.deepEqual(inspectDistributedRateLimitConfiguration({}), { state: "missing" });
  assert.deepEqual(inspectDistributedRateLimitConfiguration({
    UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  }), { state: "invalid" });
  assert.deepEqual(inspectDistributedRateLimitConfiguration({
    UPSTASH_REDIS_REST_URL: "http://example.upstash.io/path",
    UPSTASH_REDIS_REST_TOKEN: "x".repeat(32),
  }), { state: "invalid" });

  const configured = inspectDistributedRateLimitConfiguration({
    UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "x".repeat(32),
  });
  assert.equal(configured.state, "configured");
  assert.deepEqual(inspectDistributedRateLimitConfiguration({
    KV_REST_API_URL: "https://example.upstash.io",
    KV_REST_API_TOKEN: "x".repeat(32),
    DIARYDOCK_RATE_LIMIT_NAMESPACE: "staging",
  }), {
    state: "configured",
    namespace: "staging",
    token: "x".repeat(32),
    url: "https://example.upstash.io",
  });
  assert.deepEqual(inspectDistributedRateLimitConfiguration({
    UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "x".repeat(32),
    DIARYDOCK_RATE_LIMIT_NAMESPACE: "unsafe/namespace",
  }), { state: "invalid" });
});

test("distributed readiness is bounded and requires a live configured store", async () => {
  assert.equal(await distributedRateLimitReady({}, 10), true);
  assert.equal(await distributedRateLimitReady({
    DIARYDOCK_DISTRIBUTED_RATE_LIMIT_REQUIRED: "true",
  }, 10), false);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify([{ result: "PONG" }]), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
  try {
    assert.equal(await distributedRateLimitReady({
      UPSTASH_REDIS_REST_URL: "https://readiness-test.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "readiness-test-token-123456789",
    }, 100), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("configured distributed checks use the authenticated Redis REST boundary", async () => {
  const originalFetch = globalThis.fetch;
  let authorization = "";
  let requestBody = "";
  globalThis.fetch = async (_input, init) => {
    authorization = new Headers(init?.headers).get("authorization") ?? "";
    requestBody = String(init?.body ?? "");
    return new Response(JSON.stringify([{ result: [9, 10] }]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    const result = await checkDistributedRateLimit("a".repeat(64), {
      limit: 10,
      windowMs: 60_000,
    }, {
      UPSTASH_REDIS_REST_URL: "https://contract-test.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "contract-test-token-123456789",
      DIARYDOCK_RATE_LIMIT_NAMESPACE: "staging",
    });
    assert.equal(result?.allowed, true, JSON.stringify(result));
    assert.equal(result?.remaining, 9);
    assert.equal(authorization, "Bearer contract-test-token-123456789");
    assert.match(requestBody, /diarydock:staging:rate-limit:v1/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("server backend selection prefers Redis and fails closed when it is required", () => {
  assert.equal(selectServerRateLimitBackend({}), "database");
  assert.equal(selectServerRateLimitBackend({
    DIARYDOCK_DISTRIBUTED_RATE_LIMIT_REQUIRED: "true",
  }), "unavailable");
  assert.equal(selectServerRateLimitBackend({
    UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "x".repeat(32),
  }), "distributed");
  assert.equal(selectServerRateLimitBackend({
    UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "short",
  }), "unavailable");
});

test("distributed timeout fails closed and denials preserve retry timing", () => {
  assert.deepEqual(toDistributedRateLimitResult({
    success: true,
    limit: 10,
    remaining: 9,
    reset: 11_000,
    reason: "timeout",
  }, 1_000), {
    allowed: false,
    remaining: 0,
    retryAfterSeconds: 60,
    unavailable: true,
  });
  assert.deepEqual(toDistributedRateLimitResult({
    success: false,
    limit: 10,
    remaining: -1,
    reset: 11_000,
  }, 1_000), {
    allowed: false,
    remaining: 0,
    retryAfterSeconds: 10,
  });
});
