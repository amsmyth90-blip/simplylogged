import assert from "node:assert/strict";
import test from "node:test";

import {
  buildNoticeArtifacts,
  emptyNoticeDraft,
  noticeReminderGroup,
  resolveNoticeDate,
  toNoticeDateKey,
} from "../packages/kitchen/src/index.ts";
import { mergeKitchenItems } from "../components/kitchen-pantry/pantry-items.ts";

const now = new Date("2026-09-02T09:00:00.000Z");

test("notice dates resolve predictably from an explicit clock", () => {
  assert.equal(toNoticeDateKey(resolveNoticeDate("Tomorrow", now)!), "2026-09-03");
  assert.equal(toNoticeDateKey(resolveNoticeDate("This weekend", now)!), "2026-09-05");
  assert.equal(resolveNoticeDate("Whenever", now), null);
  assert.equal(noticeReminderGroup("Tomorrow", now.getTime()), "week");
  assert.equal(noticeReminderGroup("Next month", now.getTime()), "later");
});

test("notice save builds the same linked reminder and calendar records", () => {
  const result = buildNoticeArtifacts({
    draft: {
      ...emptyNoticeDraft,
      title: "  School appointment  ",
      detail: "  Bring the forms  ",
      category: "School",
      assignedTo: "Amy",
      due: "Tomorrow",
    },
    linkCalendar: true,
    linkReminder: true,
    noticeId: "notice-fixed",
    now,
  });
  assert.equal(result.notice.title, "School appointment");
  assert.equal(result.notice.detail, "Bring the forms");
  assert.equal(result.reminder?.id, "notice-reminder-notice-fixed");
  assert.equal(result.reminder?.priority, "high");
  assert.equal(result.reminder?.roomId, "kitchen");
  assert.equal(result.calendarEvent?.id, "notice-calendar-notice-fixed");
  assert.equal(result.calendarEvent?.date, "2026-09-03");
  assert.equal(result.calendarEvent?.category, "school");
});

test("editing preserves identity while disabling links removes derived records", () => {
  const existing = {
    ...emptyNoticeDraft,
    id: "notice-existing",
    title: "Old title",
    createdAt: "2026-08-01T10:00:00.000Z",
    linkedReminderId: "reminder-existing",
    linkedCalendarEventId: "calendar-existing",
  };
  const result = buildNoticeArtifacts({
    draft: { ...emptyNoticeDraft, title: "Updated title", due: "Tomorrow" },
    existing,
    linkCalendar: false,
    linkReminder: false,
    noticeId: existing.id,
    now,
  });
  assert.equal(result.notice.createdAt, existing.createdAt);
  assert.equal(result.notice.linkedReminderId, undefined);
  assert.equal(result.notice.linkedCalendarEventId, undefined);
  assert.equal(result.reminder, null);
  assert.equal(result.calendarEvent, null);
});

test("pantry merging is case-insensitive and de-duplicates one captured batch", () => {
  const current = [{ id: "existing", name: "Milk", checked: false, section: "Shopping" as const }];
  const merged = mergeKitchenItems(current, [" milk ", "Bread", "bread", ""], "Shopping");
  assert.equal(merged.length, 2);
  assert.equal(merged[1]?.name, "Bread");
  assert.equal(merged[1]?.checked, false);
  assert.equal(current.length, 1);
});
