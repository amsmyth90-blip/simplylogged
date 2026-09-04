import assert from "node:assert/strict";
import test from "node:test";

import {
  EMERGENCY_SCHEMA_VERSION,
  parseEmergencyMutation,
  parseEmergencySnapshot,
} from "../packages/emergency/src/index.ts";

const revision = "2026-09-02T09:00:00.000Z";

test("Emergency contract accepts a strict versioned snapshot", () => {
  const parsed = parseEmergencySnapshot({
    schemaVersion: EMERGENCY_SCHEMA_VERSION,
    revision,
    contacts: [{ id: "ec-1", name: "Jane", relation: "Neighbour", phone: "07700 900123" }],
    plans: [{ id: "plan-1", title: "Fire", summary: "Leave safely", steps: ["Go outside"] }],
    homeInfo: [{ label: "Stopcock", value: "Hall cupboard" }],
    careContacts: [],
  });
  assert.equal(parsed.contacts[0]?.name, "Jane");
  assert.equal(parsed.plans[0]?.steps[0], "Go outside");
});

test("Emergency contract rejects unknown, unbounded and incomplete input", () => {
  assert.throws(() => parseEmergencyMutation({
    operation: "ADD_HOME_INFO",
    revision,
    label: "Stopcock",
    value: "Hall",
    ownerId: "another-user",
  }), /unsupported fields/);
  assert.throws(() => parseEmergencyMutation({
    operation: "ADD_PLAN",
    revision,
    title: "Plan",
    summary: "Summary",
    steps: [],
  }), /steps are invalid/);
  assert.throws(() => parseEmergencySnapshot({
    schemaVersion: EMERGENCY_SCHEMA_VERSION,
    revision,
    contacts: Array.from({ length: 101 }, (_, index) => ({
      id: `ec-${index}`,
      name: "Jane",
      relation: "Neighbour",
      phone: "1",
    })),
    plans: [],
    homeInfo: [],
    careContacts: [],
  }), /contacts is invalid/);
});
