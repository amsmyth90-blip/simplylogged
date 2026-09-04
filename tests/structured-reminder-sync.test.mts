import assert from "node:assert/strict";
import test from "node:test";

import {
  createReminderSyncRequest,
  parseReminderSyncRow,
  reminderMutationPayload,
} from "../lib/structured-reminder-sync.ts";

const sourceId = "legacy-reminder-id";
const recordId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";

function row(origin: "SYSTEM_GENERATED" | "USER_CREATED" = "USER_CREATED") {
  return parseReminderSyncRow({
    deleted_at: null,
    entity_type: "reminder",
    payload: {
      group: "today", origin, priority: "normal", reminderType: "custom",
      timeLabel: "Today", timeZone: "Europe/London", title: "Renew cover",
      ...(origin === "SYSTEM_GENERATED" ? { ruleId: "insurance-renewal" } : {}),
    },
    record_id: recordId,
    revision: 9,
    schema_version: 1,
    scope_id: userId,
    scope_kind: "USER",
    updated_at: "2026-09-04T20:00:00+00:00",
  });
}

test("desktop reminders use the existing sync record for legacy source IDs", () => {
  const request = createReminderSyncRequest({
    current: row(),
    operation: "UPSERT",
    reminder: {
      group: "week", id: sourceId, priority: "high", timeLabel: "Friday",
      title: "Renew cover",
    },
  });
  assert.equal(request.mutations[0]?.recordId, recordId);
  assert.equal(request.mutations[0]?.expectedRevision, "9");
  assert.equal(request.mutations[0]?.payload.group, "week");
});

test("system reminder updates preserve protected scheduling fields", () => {
  const current = row("SYSTEM_GENERATED");
  const payload = reminderMutationPayload({
    group: "done", id: sourceId, priority: "low", timeLabel: "Changed",
    title: "Changed",
  }, current);
  assert.equal(payload.title, "Renew cover");
  assert.equal(payload.ruleId, "insurance-renewal");
  assert.equal(payload.group, "done");
  assert.equal(payload.timeLabel, "Completed");
});

test("new reminder payloads enforce the shared field limits", () => {
  assert.throws(() => createReminderSyncRequest({
    current: null,
    operation: "UPSERT",
    reminder: {
      group: "today",
      id: "33333333-3333-4333-8333-333333333333",
      priority: "normal",
      timeLabel: "Today",
      title: "x".repeat(241),
    },
  }), /title is invalid/i);
});
