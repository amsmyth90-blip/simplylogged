import assert from "node:assert/strict";
import test from "node:test";

import {
  EMERGENCY_ACCESS_SCHEMA_VERSION,
  parseEmergencyAccessDirectory,
  parseEmergencyAccessMutation,
} from "../packages/emergency-access/src/index.ts";

const directory = {
  schemaVersion: EMERGENCY_ACCESS_SCHEMA_VERSION,
  contacts: [{
    id: "27cf56cb-2c2f-4e28-96a4-48254bd9df3e",
    name: "Jane Smith",
    email: "jane@example.com",
    relation: "Neighbour",
    status: "ACTIVE",
    expiresAt: "2026-09-16T09:00:00.000Z",
    acceptedAt: "2026-09-02T10:00:00.000Z",
    grants: [],
  }],
  resources: [{ type: "CONTACT", id: "ec-jane", label: "Jane Smith", detail: "Neighbour" }],
  received: [{
    id: "95a4c45f-e05d-43d0-8320-43223b5dfe8f",
    resourceType: "INSTRUCTION",
    label: "Power cut plan",
    snapshot: { title: "Power cut plan", summary: "Check safely", steps: ["Find the torches"] },
    grantedAt: "2026-09-01T14:00:00.000Z",
    contactName: "Anna Green",
    contactRelation: "Sister",
  }],
  notifications: [],
};

test("trusted Emergency access accepts a strict, bounded directory", () => {
  const parsed = parseEmergencyAccessDirectory(directory);
  assert.equal(parsed.contacts[0]?.status, "ACTIVE");
  assert.equal(parsed.received[0]?.snapshot.steps?.[0], "Find the torches");
});

test("trusted Emergency access rejects ownership fields and snapshot leakage", () => {
  assert.throws(() => parseEmergencyAccessMutation({
    operation: "REVOKE_CONTACT",
    contactId: "27cf56cb-2c2f-4e28-96a4-48254bd9df3e",
    ownerId: "another-user",
  }), /unsupported fields/);
  assert.throws(() => parseEmergencyAccessDirectory({
    ...directory,
    received: [{ ...directory.received[0], snapshot: { ...directory.received[0].snapshot, privateNote: "hidden" } }],
  }), /unsupported fields/);
  assert.throws(() => parseEmergencyAccessDirectory({
    ...directory,
    contacts: Array.from({ length: 51 }, () => directory.contacts[0]),
  }), /Trusted contacts is invalid/);
});

test("trusted Emergency access mutations require exact typed fields", () => {
  assert.equal(parseEmergencyAccessMutation({
    operation: "SET_GRANT",
    contactId: "27cf56cb-2c2f-4e28-96a4-48254bd9df3e",
    resourceType: "DOCUMENT",
    resourceId: "document-1",
    granted: true,
  }).operation, "SET_GRANT");
  assert.throws(() => parseEmergencyAccessMutation({
    operation: "CREATE_CONTACT",
    name: "Jane",
    email: "not-an-email",
    relation: "Neighbour",
  }), /email is invalid/);
});
