import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { hasVaultAssurance } from "../lib/password-vault/assurance.ts";
import { createContentSecurityPolicy } from "../lib/http/content-security-policy.ts";

const user = { id: "owner", factors: [{ status: "verified", factor_type: "totp" }] } as User;
function client(claims: unknown, error: unknown = null, capture?: (token?: string) => void) {
  return { auth: { getClaims: async (token?: string) => {
    capture?.(token); return { data: claims ? { claims } : null, error };
  } } } as unknown as SupabaseClient;
}
test("vault requires verified AAL2 claims for the same account and a live factor", async () => {
  assert.equal(await hasVaultAssurance(client({ sub: "owner", aal: "aal2" }), user), true);
  for (const claims of [{ sub: "owner", aal: "aal1" }, { sub: "other", aal: "aal2" },
    { sub: "owner" }, null]) assert.equal(await hasVaultAssurance(client(claims), user), false);
  assert.equal(await hasVaultAssurance(client({ sub: "owner", aal: "aal2" }, new Error("Invalid signature")), user), false);
  assert.equal(await hasVaultAssurance(client({ sub: "owner", aal: "aal2" }), { ...user, factors: [] }), false);
});
test("stateless mobile bearer token is passed explicitly to claim verification", async () => {
  let received: string | undefined;
  assert.equal(await hasVaultAssurance(client({ sub: "owner", aal: "aal2" }, null, t => { received = t; }),
    user, "exact-mobile-token"), true);
  assert.equal(received, "exact-mobile-token");
});
test("unavailable claim verification fails closed", async () => {
  const unavailable = { auth: { getClaims: async () => { throw new Error("offline"); } } } as unknown as SupabaseClient;
  assert.equal(await hasVaultAssurance(unavailable, user), false);
});
test("production CSP permits nonce scripts and WASM but forbids inline scripts and event handlers", () => {
  const nonce = Buffer.alloc(24, 7).toString("base64");
  const policy = createContentSecurityPolicy(nonce, false, "https://project.supabase.co");
  const scripts = policy.split("; ").find(item => item.startsWith("script-src "))!;
  assert.ok(scripts.includes("'nonce-" + nonce + "'"));
  assert.ok(scripts.includes("'strict-dynamic'"));
  assert.ok(scripts.includes("'wasm-unsafe-eval'"));
  assert.ok(!scripts.includes("'unsafe-inline'"));
  assert.ok(!scripts.includes("'unsafe-eval'"));
  assert.ok(policy.includes("script-src-attr 'none'"));
  assert.throws(() => createContentSecurityPolicy("attacker'; script-src *", false));
});
