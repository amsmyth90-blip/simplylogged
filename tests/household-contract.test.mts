import assert from "node:assert/strict";
import test from "node:test";

import {
  HOUSEHOLD_DIRECTORY_SCHEMA_VERSION,
  parseHouseholdDirectory,
  parseHouseholdInvitePreview,
} from "@diarydock/household";

const directory = {
  householdId: "30bb4d5a-037b-49ea-88bc-1ae5299cfda1",
  householdName: "Greenwood Household",
  currentUserId: "f330a7d2-8ef1-4f6e-a6ec-118ea3a14f51",
  role: "owner",
  members: [{
    userId: "f330a7d2-8ef1-4f6e-a6ec-118ea3a14f51",
    name: "Amy Smyth",
    relation: "Me",
    role: "owner",
    joinedAt: "2026-01-01T12:00:00.000Z",
  }],
  invites: [],
  ownershipTransfer: null,
};

test("household directory contract accepts a bounded current membership", () => {
  assert.equal(HOUSEHOLD_DIRECTORY_SCHEMA_VERSION, 2);
  assert.deepEqual(parseHouseholdDirectory(directory), directory);
});

test("household invitation previews are exact, bounded and expiry checked", () => {
  const preview = {
    token: "11111111-1111-4111-8111-111111111111",
    householdName: "Greenwood Household",
    name: "Alex Smyth",
    relation: "Partner",
    access: "Adult",
    expiresAt: "2026-09-18T12:00:00.000Z",
  };
  assert.deepEqual(parseHouseholdInvitePreview(preview), preview);
  assert.throws(() => parseHouseholdInvitePreview({ ...preview, ownerId: "hidden" }),
    /unsupported fields/);
  assert.throws(() => parseHouseholdInvitePreview({ ...preview, expiresAt: "not-a-date" }),
    /expiry is invalid/);
});

test("ownership transfer requires the current owner and an active Adult nominee", () => {
  const proposedOwner = {
    userId: "b330a7d2-8ef1-4f6e-a6ec-118ea3a14f52",
    name: "Alex Smyth",
    relation: "Partner",
    role: "member",
    joinedAt: "2026-01-02T12:00:00.000Z",
  };
  const ownershipTransfer = {
    id: "c330a7d2-8ef1-4f6e-a6ec-118ea3a14f53",
    currentOwnerId: directory.currentUserId,
    proposedOwnerId: proposedOwner.userId,
    createdAt: "2026-01-03T12:00:00.000Z",
    expiresAt: "2026-01-04T12:00:00.000Z",
  };
  assert.deepEqual(parseHouseholdDirectory({ ...directory,
    members: [...directory.members, proposedOwner], ownershipTransfer }).ownershipTransfer,
  ownershipTransfer);
  assert.throws(() => parseHouseholdDirectory({ ...directory,
    members: [...directory.members, { ...proposedOwner, role: "viewer" }], ownershipTransfer }),
  /transfer membership is invalid/);
  assert.throws(() => parseHouseholdDirectory({ ...directory,
    members: [...directory.members, proposedOwner],
    ownershipTransfer: { ...ownershipTransfer, expiresAt: ownershipTransfer.createdAt } }),
  /transfer is invalid/);
});

test("household directory contract rejects unknown nested fields and role mismatches", () => {
  assert.throws(() => parseHouseholdDirectory({
    ...directory,
    members: [{ ...directory.members[0], secret: "not allowed" }],
  }), /unsupported fields/);
  assert.throws(() => parseHouseholdDirectory({ ...directory, role: "viewer" }), /membership is invalid/);
});

test("household directory contract caps members and invitations", () => {
  assert.throws(() => parseHouseholdDirectory({
    ...directory,
    members: Array.from({ length: 21 }, (_, index) => ({
      ...directory.members[0],
      userId: `member-${index}`,
    })),
  }), /members are invalid/);
  assert.throws(() => parseHouseholdDirectory({
    ...directory,
    invites: Array.from({ length: 21 }, (_, index) => ({
      token: `token-${index}`,
      email: `person${index}@example.com`,
      name: `Person ${index}`,
      relation: "Family",
      access: "viewer",
      createdAt: "2026-01-01T12:00:00.000Z",
      expiresAt: "2026-01-08T12:00:00.000Z",
    })),
  }), /invitations are invalid/);
});
