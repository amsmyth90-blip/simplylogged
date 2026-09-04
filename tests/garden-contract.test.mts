import assert from "node:assert/strict";
import test from "node:test";

import {
  belongsInGarden,
  gardenDocumentMatches,
  gardenReminderMatches,
  gardenSections,
  getGardenSection,
  isGardenSection,
} from "../packages/garden/src/index.ts";

test("Garden sections have stable identity and complete classification terms", () => {
  assert.deepEqual(
    gardenSections.map((section) => section.id),
    ["pets", "outdoor-spaces", "jobs", "tools-shed", "bins"],
  );
  assert.equal(new Set(gardenSections.map((section) => section.id)).size, 5);
  for (const section of gardenSections) {
    assert.ok(section.documentTerms.length > 0);
    assert.ok(section.reminderTerms.length > 0);
    assert.ok(section.scope.length > 0);
    assert.equal(getGardenSection(section.id), section);
  }
  assert.equal(isGardenSection("tools-shed"), true);
  assert.equal(isGardenSection("garage"), false);
});

test("Garden document classification matches the intended specialist section", () => {
  assert.equal(
    gardenDocumentMatches(
      { title: "Annual vaccination record", category: "Pets" },
      "pets",
    ),
    true,
  );
  assert.equal(
    gardenDocumentMatches(
      { title: "Lawnmower manual", category: "Equipment" },
      "tools-shed",
    ),
    true,
  );
  assert.equal(
    gardenDocumentMatches({ title: "Council recycling calendar" }, "bins"),
    true,
  );
  assert.equal(
    gardenDocumentMatches(
      { title: "Motor insurance", roomId: "garage" },
      "pets",
    ),
    false,
  );
  assert.equal(
    gardenDocumentMatches(
      { title: "Uncategorised image", roomId: "garden" },
      "jobs",
    ),
    true,
  );
});

test("Garden reminders exclude completed work and preserve room identity", () => {
  assert.equal(
    gardenReminderMatches({ title: "Trim hedge", group: "week" }, "jobs"),
    true,
  );
  assert.equal(
    gardenReminderMatches({ title: "Trim hedge", group: "done" }, "jobs"),
    false,
  );
  assert.equal(
    gardenReminderMatches(
      { title: "Put recycling out", group: "today" },
      "bins",
    ),
    true,
  );
  assert.equal(belongsInGarden({ roomId: "garden" }), true);
  assert.equal(belongsInGarden({ roomName: "GARDEN" }), true);
  assert.equal(belongsInGarden({ roomName: "Garage" }), false);
});
