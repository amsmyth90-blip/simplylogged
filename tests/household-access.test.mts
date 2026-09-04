import assert from "node:assert/strict";
import test from "node:test";

import {
  householdAuditLabel,
  householdRoleDescription,
  householdRoleLabel,
  sharedDocumentSummary
} from "../lib/household-access.ts";

test("maps legacy database roles to simple consumer language", () => {
  assert.equal(householdRoleLabel("owner"), "Owner");
  assert.equal(householdRoleLabel("member"), "Adult");
  assert.equal(householdRoleLabel("viewer"), "Member");
  assert.match(householdRoleDescription("viewer"), /deliberately shared/i);
});

test("counts only the current user's documents deliberately visible to a person", () => {
  const summary = sharedDocumentSummary({
    currentUserId: "owner-a",
    targetUserId: "member-b",
    documents: [
      { id: "private", title: "Private", category: "Home", kind: "PDF", size: "1 MB", updated: "Now", ownerId: "owner-a", visibility: "PRIVATE" },
      { id: "household", title: "Household", category: "Home", kind: "PDF", size: "1 MB", updated: "Now", ownerId: "owner-a", visibility: "HOUSEHOLD" },
      { id: "selected", title: "Selected", category: "Home", kind: "PDF", size: "1 MB", updated: "Now", ownerId: "owner-a", visibility: "SELECTED_MEMBERS", sharedWithUserIds: ["member-b"] },
      { id: "someone-elses", title: "Other owner", category: "Home", kind: "PDF", size: "1 MB", updated: "Now", ownerId: "owner-c", visibility: "HOUSEHOLD" }
    ]
  });

  assert.deepEqual(summary, { householdCount: 1, selectedCount: 1, totalCount: 2 });
});

test("does not count selected documents granted to somebody else", () => {
  const summary = sharedDocumentSummary({
    currentUserId: "owner-a",
    targetUserId: "member-b",
    documents: [
      { id: "selected", title: "Selected", category: "Home", kind: "PDF", size: "1 MB", updated: "Now", ownerId: "owner-a", visibility: "SELECTED_MEMBERS", sharedWithUserIds: ["member-c"] }
    ]
  });

  assert.equal(summary.totalCount, 0);
});

test("uses non-sensitive language for audit events", () => {
  assert.equal(householdAuditLabel("RESOURCE_UNSHARED"), "A document was made private");
  assert.equal(householdAuditLabel("UNKNOWN_EVENT"), "Household access changed");
});
