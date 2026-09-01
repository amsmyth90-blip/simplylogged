import assert from "node:assert/strict";
import test from "node:test";

import { createPhysicalLinkToken, hashPhysicalSecret, physicalLinkPath, verifyPhysicalSecret } from "../lib/physical-links.ts";

test("creates opaque non-sequential physical link tokens", () => {
  const first = createPhysicalLinkToken();
  const second = createPhysicalLinkToken();
  assert.notEqual(first.publicId, second.publicId);
  assert.notEqual(first.secret, second.secret);
  assert.equal(first.secretHash.length, 64);
  assert.equal(physicalLinkPath(first.publicId, first.secret).includes("asset"), false);
});

test("stores a verifier rather than the raw physical link secret", () => {
  const token = createPhysicalLinkToken();
  assert.notEqual(token.secretHash, token.secret);
  assert.equal(token.secretHash, hashPhysicalSecret(token.secret));
  assert.equal(verifyPhysicalSecret(token.secret, token.secretHash), true);
  assert.equal(verifyPhysicalSecret(createPhysicalLinkToken().secret, token.secretHash), false);
});

test("rejects malformed public payload components", () => {
  assert.throws(() => physicalLinkPath("asset-123", "secret"));
});
