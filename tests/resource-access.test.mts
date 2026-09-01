import assert from "node:assert/strict";
import test from "node:test";

import { decideResourceAccess, mapLegacyHouseholdRole } from "../lib/resource-access.ts";

const activeMembership = {
  householdId: "household-a",
  resourceHouseholdId: "household-a",
  role: "ADULT" as const,
  active: true
};

test("always lets the owner manage their own resource", () => {
  assert.deepEqual(decideResourceAccess({
    actorUserId: "user-a",
    ownerUserId: "user-a",
    action: "SHARE",
    visibility: "PRIVATE",
    isVaultResource: true
  }), { allowed: true, reason: "OWNER" });
});

test("denies another household member a private resource", () => {
  assert.deepEqual(decideResourceAccess({
    actorUserId: "user-b",
    ownerUserId: "user-a",
    action: "VIEW",
    visibility: "PRIVATE",
    membership: activeMembership
  }), { allowed: false, reason: "PRIVATE" });
});

test("keeps Vault resources private through the generic household model", () => {
  assert.deepEqual(decideResourceAccess({
    actorUserId: "user-b",
    ownerUserId: "user-a",
    action: "VIEW",
    visibility: "HOUSEHOLD",
    isVaultResource: true,
    membership: activeMembership
  }), { allowed: false, reason: "VAULT_PRIVATE" });
});

test("allows active household members to view household-visible resources only", () => {
  assert.equal(decideResourceAccess({
    actorUserId: "user-b",
    ownerUserId: "user-a",
    action: "VIEW",
    visibility: "HOUSEHOLD",
    membership: activeMembership
  }).allowed, true);

  assert.deepEqual(decideResourceAccess({
    actorUserId: "user-b",
    ownerUserId: "user-a",
    action: "EDIT",
    visibility: "HOUSEHOLD",
    membership: activeMembership
  }), { allowed: false, reason: "HOUSEHOLD_EDIT_DENIED" });
});

test("denies removed members and members of another household", () => {
  assert.deepEqual(decideResourceAccess({
    actorUserId: "user-b",
    ownerUserId: "user-a",
    action: "VIEW",
    visibility: "HOUSEHOLD",
    membership: { ...activeMembership, active: false }
  }), { allowed: false, reason: "NO_ACTIVE_MEMBERSHIP" });

  assert.deepEqual(decideResourceAccess({
    actorUserId: "user-b",
    ownerUserId: "user-a",
    action: "VIEW",
    visibility: "HOUSEHOLD",
    membership: { ...activeMembership, householdId: "household-b" }
  }), { allowed: false, reason: "WRONG_HOUSEHOLD" });
});

test("requires an active action-specific grant for selected members", () => {
  const selectedMemberGrants = [{ userId: "user-b", actions: ["VIEW" as const] }];

  assert.equal(decideResourceAccess({
    actorUserId: "user-b",
    ownerUserId: "user-a",
    action: "VIEW",
    visibility: "SELECTED_MEMBERS",
    membership: activeMembership,
    selectedMemberGrants
  }).allowed, true);

  assert.equal(decideResourceAccess({
    actorUserId: "user-b",
    ownerUserId: "user-a",
    action: "EDIT",
    visibility: "SELECTED_MEMBERS",
    membership: activeMembership,
    selectedMemberGrants
  }).allowed, false);

  assert.equal(decideResourceAccess({
    actorUserId: "user-b",
    ownerUserId: "user-a",
    action: "VIEW",
    visibility: "SELECTED_MEMBERS",
    membership: activeMembership,
    selectedMemberGrants: [{ ...selectedMemberGrants[0], revokedAt: "2026-08-31T12:00:00Z" }]
  }).allowed, false);
});

test("maps the existing database roles onto the new consumer role contract", () => {
  assert.equal(mapLegacyHouseholdRole("owner"), "OWNER");
  assert.equal(mapLegacyHouseholdRole("member"), "ADULT");
  assert.equal(mapLegacyHouseholdRole("viewer"), "MEMBER");
});
