import assert from "node:assert/strict";
import test from "node:test";

import {
  checkRateLimit,
  createRateLimitKey,
  getForwardedClientIp,
} from "../lib/rate-limit.ts";

test("creates stable, non-readable rate-limit keys", () => {
  const key = createRateLimitKey("auth:signin", "203.0.113.5", "amy@example.com");

  assert.equal(key, createRateLimitKey("auth:signin", "203.0.113.5", "amy@example.com"));
  assert.notEqual(key, createRateLimitKey("auth:signin", "203.0.113.6", "amy@example.com"));
  assert.match(key, /^[a-f0-9]{64}$/);
  assert.equal(key.includes("amy@example.com"), false);
});

test("uses the first forwarded client address", () => {
  assert.equal(
    getForwardedClientIp(new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.2" })),
    "203.0.113.5",
  );
  assert.equal(getForwardedClientIp(new Headers({ "x-real-ip": "198.51.100.8" })), "198.51.100.8");
  assert.equal(getForwardedClientIp(new Headers()), "unknown");
});

test("blocks requests after the configured limit", () => {
  const key = createRateLimitKey("test", crypto.randomUUID());
  const options = { limit: 2, windowMs: 60_000 };

  assert.deepEqual(checkRateLimit(key, options), {
    allowed: true,
    remaining: 1,
    retryAfterSeconds: 0,
  });
  assert.deepEqual(checkRateLimit(key, options), {
    allowed: true,
    remaining: 0,
    retryAfterSeconds: 0,
  });

  const blocked = checkRateLimit(key, options);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.ok(blocked.retryAfterSeconds >= 1);
});

test("keeps separate rate-limit buckets independent", () => {
  const firstKey = createRateLimitKey("test-a", crypto.randomUUID());
  const secondKey = createRateLimitKey("test-b", crypto.randomUUID());
  const options = { limit: 1, windowMs: 60_000 };

  assert.equal(checkRateLimit(firstKey, options).allowed, true);
  assert.equal(checkRateLimit(firstKey, options).allowed, false);
  assert.equal(checkRateLimit(secondKey, options).allowed, true);
});
