// Synthetic QA factor helper only. Never log or persist authenticator secrets.
import { createHmac } from "node:crypto";
import assert from "node:assert/strict";

export function totp(secret, now = Date.now()) {
  let bits = "";
  for (const char of secret.toUpperCase().replace(/=+$/, "")) {
    const value = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(char);
    if (value < 0) throw new Error("Invalid test TOTP secret");
    bits += value.toString(2).padStart(5, "0");
  }
  const key = Buffer.from(Array.from({ length: Math.floor(bits.length / 8) }, (_, i) =>
    parseInt(bits.slice(i * 8, i * 8 + 8), 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30_000)));
  const hash = createHmac("sha1", key).update(counter).digest();
  key.fill(0);
  const offset = hash[hash.length - 1] & 15;
  return ((hash.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0");
}

export async function enrollQaFactor(client, actor) {
  const identity = await client.auth.getUser();
  assert.equal(identity.data.user?.id, actor.id);
  assert.equal(identity.data.user?.user_metadata?.purpose, "diarydock-web-e2e");
  const result = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "Disposable vault QA " + crypto.randomUUID() });
  assert.equal(result.error, null, "QA MFA enrollment must succeed");
  return { id: result.data.id, secret: result.data.totp.secret };
}

export async function verifyQaFactor(client, factor) {
  const result = await client.auth.mfa.challengeAndVerify({ factorId: factor.id, code: totp(factor.secret) });
  assert.equal(result.error, null, "QA MFA verification must succeed");
  assert.equal((await client.auth.mfa.getAuthenticatorAssuranceLevel()).data?.currentLevel, "aal2");
  return (await client.auth.getSession()).data.session;
}

export async function removeQaFactor(admin, actor, id) {
  const identity = await admin.auth.admin.getUserById(actor.id);
  assert.equal(identity.data.user?.user_metadata?.purpose, "diarydock-web-e2e");
  const result = await admin.auth.admin.mfa.deleteFactor({ userId: actor.id, id });
  assert.equal(result.error, null, "Temporary QA factor cleanup must succeed");
}
