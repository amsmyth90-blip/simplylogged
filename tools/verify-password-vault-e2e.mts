// Only the two previously authorised, labelled QA accounts may be used.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import env from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { createVault, decryptCredential, encryptCredential, parseVaultSnapshot,
  unlockVault, type PasswordVaultSnapshot } from "@diarydock/password-vault";

if (process.env.DIARYDOCK_E2E_CONFIRM !== "two-test-accounts") throw new Error("QA opt-in required.");
env.loadEnvConfig(process.cwd());
const base = process.env.VAULT_E2E_ORIGIN || "http://127.0.0.1:3027";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
const actors = JSON.parse(await readFile(".qa-web-e2e/accounts.json", "utf8")) as Array<{
  id: string; email: string; password: string; label: string;
}>;
assert.equal(actors.length, 2);
const clients = [];
for (const actor of actors) {
  const verified = await admin.auth.admin.getUserById(actor.id);
  assert.equal(verified.data.user?.user_metadata?.purpose, "diarydock-web-e2e");
  assert.equal(verified.data.user?.email, actor.email);
  const cookies = new Map<string, string>();
  const client = createServerClient(url, publicKey, { cookies: {
    getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
    setAll: (values) => values.forEach(({ name, value }) => cookies.set(name, value)),
  } });
  const { data, error } = await client.auth.signInWithPassword({ email: actor.email, password: actor.password });
  assert.equal(error, null, "QA sign-in must succeed");
  clients.push({ ...actor, client, token: data.session!.access_token,
    cookie: () => [...cookies].map(([name, value]) => `${name}=${value}`).join("; ") });
}
const [a, b] = clients;
function pass(name: string) { console.log(`PASS ${name}`); }
async function request(actor: typeof a | null, body?: unknown, cookie = false, extra: Record<string, string> = {}) {
  const response = await fetch(`${base}/api/password-vault`, {
    method: body ? "POST" : "GET", signal: AbortSignal.timeout(60_000),
    headers: { Origin: base, ...(actor ? cookie ? { Cookie: actor.cookie(), "X-DiaryDock-Account": actor.id }
      : { Authorization: `Bearer ${actor.token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}), ...extra },
    body: body ? JSON.stringify(body) : undefined,
  });
  const value = await response.json();
  assert.match(response.headers.get("cache-control") || "", /no-store/);
  return { status: response.status, value };
}
function snapshot(result: Awaited<ReturnType<typeof request>>) {
  assert.equal(result.status, 200, `Vault request failed: ${result.value.error ?? result.status}`);
  const parsed = parseVaultSnapshot(result.value.snapshot);
  assert.ok(parsed, "Valid ciphertext snapshot required");
  return parsed;
}
let created = false;
try {
  assert.equal((await request(null)).status, 401); pass("anonymous vault access denied");
  const initial = snapshot(await request(a));
  assert.equal(initial.setup, null, "Refusing to overwrite an existing QA vault");
  const bInitial = snapshot(await request(b));
  const passphrase = "Synthetic vault passphrase for QA only";
  const vault = await createVault(a.id, passphrase);
  const setupResponse = await request(a, { action: "SETUP", setup: vault.setup }, true);
  created = setupResponse.status === 200;
  snapshot(setupResponse); pass("browser account creates an encrypted vault");
  assert.equal((await request(a, { action: "SETUP", setup: vault.setup }, true)).status, 409);
  const now = new Date().toISOString();
  const credential = { id: crypto.randomUUID(), name: "Synthetic QA password account",
    username: "qa@example.test", password: "Only-a-synthetic-QA-secret!", website: "https://example.test",
    notes: "Synthetic QA notes", createdAt: now, updatedAt: now };
  const encrypted = await encryptCredential(a.id, credential, vault.masterKey);
  const first = snapshot(await request(a, { action: "PUT_ENTRY", entry: encrypted, expectedRevision: 0 }, true));
  assert.equal(first.entries.length, 1); pass("browser encrypted save persists");
  const native = snapshot(await request(a));
  const key = await unlockVault(a.id, passphrase, native.setup!);
  assert.deepEqual(await decryptCredential(a.id, native.entries[0], key), credential);
  pass("mobile bearer session reads and decrypts the browser-created account");
  const other = snapshot(await request(b));
  assert.deepEqual(other, bInitial); pass("account B cannot read account A's vault");
  for (const actor of [a, b]) for (const table of ["password_vaults", "password_vault_entries"]) {
    const direct = await actor.client.from(table).select("user_id").eq("user_id", a.id);
    assert.equal(direct.error?.code, "42501");
  }
  pass("direct database access denied for both owner and other account");
  const raw = await admin.from("password_vault_entries").select("*").eq("user_id", a.id).eq("id", credential.id).single();
  assert.equal(raw.error, null);
  for (const value of [credential.name, credential.username, credential.password, credential.notes])
    assert.equal(JSON.stringify(raw.data).includes(value), false);
  pass("database ciphertext contains no credential fields");
  const updated = { ...credential, password: "Changed-synthetic-secret!", updatedAt: new Date().toISOString() };
  const secondEncrypted = await encryptCredential(a.id, updated, key, 2);
  snapshot(await request(a, { action: "PUT_ENTRY", entry: secondEncrypted, expectedRevision: 1 }));
  const fromWeb = snapshot(await request(a, undefined, true));
  assert.deepEqual(await decryptCredential(a.id, fromWeb.entries[0], key), updated);
  pass("mobile update is visible and decryptable on web");
  assert.equal((await request(a, { action: "PUT_ENTRY", entry: secondEncrypted, expectedRevision: 1 })).status, 409);
  pass("stale revision cannot overwrite another device's change");
  assert.equal((await request(a, { action: "DELETE_ENTRY", id: credential.id, expectedRevision: 2 }, true,
    { Origin: "https://attacker.invalid" })).status, 403);
  assert.equal((await request(a, { action: "DELETE_ENTRY", id: credential.id, expectedRevision: 2 }, true,
    { "X-DiaryDock-Account": b.id })).status, 409);
  pass("cross-site and stale-account browser writes denied");
  assert.equal((await request(b, { action: "DELETE_ENTRY", id: credential.id, expectedRevision: 2 })).status, 409);
  assert.equal(snapshot(await request(a)).entries.length, 1);
  pass("account B cannot delete account A's item");
  const removed: PasswordVaultSnapshot = snapshot(await request(a, { action: "DELETE_ENTRY", id: credential.id, expectedRevision: 2 }));
  assert.equal(removed.entries.length, 0); pass("delete persists across clients");
} finally {
  if (created) {
    const result = await admin.from("password_vaults").delete().eq("user_id", a.id);
    assert.equal(result.error, null, "Synthetic vault cleanup failed");
    pass("synthetic vault removed; existing user records untouched");
  }
}
