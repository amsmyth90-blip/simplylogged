import assert from "node:assert/strict";
import test from "node:test";

import { assertMobileSupabasePublicKey } from "../apps/mobile/src/auth/supabase-config.ts";

function jwt(role: string) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ role, ref: "project" })).toString("base64url");
  return `${header}.${payload}.signature`;
}

test("mobile configuration accepts only publishable or anonymous credentials", () => {
  const publishable = `sb_publishable_${"a".repeat(32)}`;
  assert.equal(assertMobileSupabasePublicKey(publishable), publishable);
  assert.equal(assertMobileSupabasePublicKey(jwt("anon")), jwt("anon"));
});

test("mobile configuration rejects modern and legacy server credentials", () => {
  assert.throws(() => assertMobileSupabasePublicKey(`sb_secret_${"a".repeat(40)}`), /server credential/i);
  assert.throws(() => assertMobileSupabasePublicKey(jwt("service_role")), /server credential/i);
  assert.throws(() => assertMobileSupabasePublicKey(jwt("authenticated")), /server credential/i);
});

test("mobile configuration rejects unknown opaque key formats", () => {
  assert.throws(() => assertMobileSupabasePublicKey("opaque-client-key-that-is-not-classified"), /server credential/i);
  assert.throws(() => assertMobileSupabasePublicKey(`sb_publishable_${"a".repeat(20)}!`), /invalid/i);
});
