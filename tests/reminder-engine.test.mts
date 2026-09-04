import assert from "node:assert/strict";
import test from "node:test";

import { buildSystemReminderSchedule, offsetsForReminderType } from "../lib/reminder-engine.ts";

const base = {
  userId: "user-1",
  sourceResourceType: "vehicle",
  sourceResourceId: "car-1",
  sourceDateKey: "mot_expiry",
  dueAt: "2027-10-18T09:00:00.000Z"
};

test("creates deterministic reminder offsets without duplicates", () => {
  const schedule = buildSystemReminderSchedule({ ...base, offsets: [30, 7, 7, 1] });
  assert.deepEqual(schedule.map((item) => item.offsetDays), [30, 7, 1]);
  assert.equal(new Set(schedule.map((item) => item.dedupeKey)).size, 3);
});

test("changing a source date keeps keys stable and changes reminder dates", () => {
  const before = buildSystemReminderSchedule({ ...base, offsets: [30] })[0];
  const after = buildSystemReminderSchedule({ ...base, dueAt: "2027-11-18T09:00:00.000Z", offsets: [30] })[0];
  assert.equal(before.dedupeKey, after.dedupeKey);
  assert.notEqual(before.remindAt, after.remindAt);
});

test("rejects invalid due dates and unsafe offsets", () => {
  assert.throws(() => buildSystemReminderSchedule({ ...base, dueAt: "unknown" }));
  assert.deepEqual(buildSystemReminderSchedule({ ...base, offsets: [-1, 366, 14.5] }), []);
});

test("uses record-specific reminder schedules", () => {
  assert.deepEqual(offsetsForReminderType("vaccination_due"), [30, 14, 7, 1]);
  assert.deepEqual(offsetsForReminderType("warranty_expiry"), [60, 30, 14, 7, 1]);
  assert.deepEqual(offsetsForReminderType("mot_expiry"), [90, 60, 30, 14, 7, 1]);
});
