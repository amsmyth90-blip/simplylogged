import assert from "node:assert/strict";
import test from "node:test";

import type { LocalRecord, OfflineStore, StageMutationInput } from "../packages/offline-store/src/index.ts";
import {
  parseReminder,
  ReminderService,
  reminderPayload,
  systemReminderCompletionPayload,
} from "../packages/reminders/src/index.ts";

const record: LocalRecord = {
  id: "9e152506-4667-42e8-84df-47a87956aef9",
  entityType: "reminder",
  scope: { kind: "USER", id: "f330a7d2-8ef1-4f6e-a6ec-118ea3a14f51" },
  revision: "4",
  schemaVersion: 1,
  updatedAt: "2026-09-01T18:30:00.000Z",
  deletedAt: null,
  payload: {
    title: "Renew home insurance",
    group: "today",
    timeLabel: "Today",
    priority: "high",
    origin: "USER_CREATED",
    reminderType: "custom",
    timeZone: "Europe/London",
  },
  syncState: "CLEAN",
};

test("parses a versioned reminder projection without ownership metadata", () => {
  const reminder = parseReminder(record);
  assert.equal(reminder.title, "Renew home insurance");
  assert.equal(reminder.origin, "USER_CREATED");
  assert.equal("ownerId" in reminder, false);
});

test("builds an allowlisted user reminder mutation", () => {
  const payload = reminderPayload({
    title: "  Book annual service  ",
    group: "week",
    timeLabel: "This week",
    priority: "normal",
    timeZone: "UTC",
  });
  assert.equal(payload.title, "Book annual service");
  assert.equal(payload.origin, "USER_CREATED");
  assert.equal(payload.reminderType, "custom");
  assert.equal("ownerId" in payload, false);
});

test("stages an appointment reminder with its pre-linked identifier", async () => {
  const staged: StageMutationInput[] = [];
  const store = {
    stageMutation: async (input: StageMutationInput) => {
      staged.push(input);
      return { recordId: input.recordId };
    },
  } as unknown as OfflineStore;
  await new ReminderService(store).createWithId("appointment-reminder-1", {
    title: "Annual health review",
    group: "later",
    timeLabel: "2026-09-18, 10:30",
    priority: "normal",
    dueAt: "2026-09-18T10:30:00",
    roomId: "bedroom",
    roomName: "Bedroom",
    timeZone: "Europe/London",
  });
  assert.equal(staged[0]?.recordId, "appointment-reminder-1");
  assert.equal(staged[0]?.entityType, "reminder");
  assert.equal(staged[0]?.payload.ownerId, undefined);
});

test("rejects malformed server projections and invalid outgoing fields", () => {
  assert.throws(
    () => parseReminder({ ...record, payload: { ...record.payload, origin: "IMPERSONATED" } }),
    /origin is invalid/,
  );
  assert.throws(
    () => reminderPayload({
      title: " ",
      group: "today",
      timeLabel: "Today",
      priority: "normal",
      timeZone: "Europe/London",
    }),
    /title is invalid/,
  );
});

test("system reminders expose only a constrained completion mutation", () => {
  const reminder = parseReminder({
    ...record,
    payload: {
      ...record.payload,
      origin: "SYSTEM_GENERATED",
      reminderType: "document-renewal",
      sourceResourceType: "document",
      sourceResourceId: "doc-42",
      ruleId: "renewal-30-days",
      ruleVersion: 2,
      scheduleOffsetDays: -30,
    },
  });
  const completed = systemReminderCompletionPayload(reminder, true);
  assert.equal(completed.group, "done");
  assert.equal(completed.timeLabel, "Completed");
  assert.equal(completed.sourceResourceId, "doc-42");
  assert.equal(completed.ruleVersion, 2);
  assert.throws(() => systemReminderCompletionPayload(parseReminder(record), true), /system reminder/);
});
