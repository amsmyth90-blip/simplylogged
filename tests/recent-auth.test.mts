import assert from "node:assert/strict";
import test from "node:test";

import {
  hasRecentAuthentication,
  hasRecentPasswordRecovery,
  RECENT_AUTH_WINDOW_MS,
} from "../lib/auth/recent-auth.ts";

const now = Date.parse("2026-09-01T10:00:00.000Z");

test("accepts a sign-in inside the recent authentication window", () => {
  assert.equal(hasRecentAuthentication("2026-09-01T09:50:00.000Z", now), true);
});

test("rejects missing, invalid, old and future sign-in timestamps", () => {
  assert.equal(hasRecentAuthentication(null, now), false);
  assert.equal(hasRecentAuthentication("not-a-date", now), false);
  assert.equal(hasRecentAuthentication(new Date(now - RECENT_AUTH_WINDOW_MS - 1).toISOString(), now), false);
  assert.equal(hasRecentAuthentication(new Date(now + 1).toISOString(), now), false);
});

test("accepts a password change only from a fresh recovery sign-in", () => {
  const seconds = (ms: number) => Math.floor(ms / 1000);
  assert.equal(hasRecentPasswordRecovery({ amr: [{ method: "recovery", timestamp: seconds(now - 60_000) }] }, now), true);
  assert.equal(hasRecentPasswordRecovery({ amr: [{ method: "otp", timestamp: seconds(now - 60_000) }] }, now), true);
  assert.equal(hasRecentPasswordRecovery({ amr: [{ method: "password", timestamp: seconds(now - 60_000) }] }, now), false);
  assert.equal(hasRecentPasswordRecovery({ amr: [{ method: "recovery", timestamp: seconds(now - RECENT_AUTH_WINDOW_MS - 1_000) }] }, now), false);
  assert.equal(hasRecentPasswordRecovery({ amr: ["recovery"] }, now), false);
  assert.equal(hasRecentPasswordRecovery(null, now), false);
});
