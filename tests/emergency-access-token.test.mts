import assert from "node:assert/strict";
import test from "node:test";

import { createEmergencyInviteToken, emergencyInvitePath, hashEmergencyInviteSecret, isEmergencyInvitePayload } from "../lib/emergency-access.ts";

test("creates opaque one-time trusted-access invitation tokens", () => {
  const first = createEmergencyInviteToken(); const second = createEmergencyInviteToken();
  assert.notEqual(first.publicId, second.publicId); assert.notEqual(first.secret, second.secret);
  assert.equal(first.secretHash, hashEmergencyInviteSecret(first.secret));
  assert.equal(first.secretHash.includes(first.secret), false);
  assert.equal(isEmergencyInvitePayload(first.publicId, first.secret), true);
  assert.match(emergencyInvitePath(first.publicId, first.secret), /^\/emergency\/invite\//);
});

test("rejects malformed invitation payloads", () => {
  assert.equal(isEmergencyInvitePayload("1", "secret"), false);
  assert.throws(() => emergencyInvitePath("../owner", "secret"));
});
