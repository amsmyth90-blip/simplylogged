import assert from "node:assert/strict";
import test from "node:test";

import {
  defaultPermissionDecision,
  riskForAction,
  sensitivityRequiresConfirmation,
} from "../lib/actions/permissions.ts";

test("classifies actions by their potential impact", () => {
  assert.equal(riskForAction("create_reminder"), "low");
  assert.equal(riskForAction("update_record"), "medium");
  assert.equal(riskForAction("share_document"), "high");
  assert.equal(riskForAction("cancel_subscription"), "very_high");
});

test("never allows very high risk actions to run automatically", () => {
  const decision = defaultPermissionDecision({
    actionType: "make_purchase",
    autopilotAllowed: true,
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.requiresConfirmation, true);
});

test("requires explicit confirmation before sharing or contacting providers", () => {
  for (const actionType of ["share_document", "draft_email", "contact_provider"] as const) {
    const decision = defaultPermissionDecision({ actionType, autopilotAllowed: true });
    assert.equal(decision.allowed, true);
    assert.equal(decision.requiresConfirmation, true);
  }
});

test("sensitive information always requires confirmation", () => {
  assert.equal(sensitivityRequiresConfirmation("standard"), false);
  assert.equal(sensitivityRequiresConfirmation("private"), false);
  assert.equal(sensitivityRequiresConfirmation("sensitive"), true);
  assert.equal(sensitivityRequiresConfirmation("highly_sensitive"), true);

  const decision = defaultPermissionDecision({
    actionType: "create_reminder",
    sensitivity: "highly_sensitive",
    autopilotAllowed: true,
  });
  assert.equal(decision.requiresConfirmation, true);
});

test("only low risk actions can use the autopilot preference", () => {
  assert.deepEqual(
    defaultPermissionDecision({ actionType: "classify_document", autopilotAllowed: true }),
    {
      allowed: true,
      requiresConfirmation: false,
      reason: "Low risk action is allowed by the current autopilot setting.",
    },
  );
  assert.equal(
    defaultPermissionDecision({ actionType: "classify_document", autopilotAllowed: false })
      .requiresConfirmation,
    true,
  );
});
