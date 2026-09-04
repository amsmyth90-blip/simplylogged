import { array, exact, optionalText, record, revision, text } from "./helpers.ts";
import {
  KITCHEN_NOTICEBOARD_SCHEMA_VERSION,
  type KitchenNotice,
  type KitchenNoticeboardSnapshot,
  type NoticeCategory,
  type NoticeColour,
  type NoticeSource,
} from "./notice-types.ts";

export function parseNoticeCategory(value: unknown): NoticeCategory {
  if (value !== "School" && value !== "Home" && value !== "Health" && value !== "Plans") {
    throw new Error("Notice category is invalid.");
  }
  return value;
}

export function parseNoticeColour(value: unknown): NoticeColour {
  if (value !== "cream" && value !== "sage" && value !== "blue" && value !== "clay") {
    throw new Error("Notice colour is invalid.");
  }
  return value;
}

export function parseNoticeSource(value: unknown): NoticeSource {
  if (value !== "manual" && value !== "photo" && value !== "voice") {
    throw new Error("Notice source is invalid.");
  }
  return value;
}

function date(value: unknown, label: string) {
  const parsed = text(value, label, 40);
  if (!Number.isFinite(Date.parse(parsed))) throw new Error(`${label} is invalid.`);
  return parsed;
}

function optionalDate(value: unknown, label: string) {
  if (value === undefined) return undefined;
  return date(value, label);
}

function boundedString(value: unknown, label: string, maximum: number) {
  if (typeof value !== "string" || value.length > maximum) throw new Error(`${label} is invalid.`);
  return value.trim();
}

export function parseKitchenNotice(value: unknown): KitchenNotice {
  const notice = record(value, "Kitchen notice");
  exact(notice, ["id", "title", "detail", "category", "assignedTo", "due", "colour",
    "pinned", "completed", "archived", "createdAt", "completedAt", "archivedAt", "source",
    "linkedReminderId", "linkedCalendarEventId"], "Kitchen notice");
  if (typeof notice.pinned !== "boolean" || typeof notice.completed !== "boolean"
    || typeof notice.archived !== "boolean") throw new Error("Kitchen notice state is invalid.");
  return {
    id: text(notice.id, "Kitchen notice ID", 160),
    title: text(notice.title, "Kitchen notice title", 54),
    detail: boundedString(notice.detail, "Kitchen notice detail", 120),
    category: parseNoticeCategory(notice.category),
    assignedTo: text(notice.assignedTo, "Kitchen notice assignee", 120),
    due: boundedString(notice.due, "Kitchen notice due label", 60),
    colour: parseNoticeColour(notice.colour),
    pinned: notice.pinned,
    completed: notice.completed,
    archived: notice.archived,
    createdAt: date(notice.createdAt, "Kitchen notice creation date"),
    completedAt: optionalDate(notice.completedAt, "Kitchen notice completion date"),
    archivedAt: optionalDate(notice.archivedAt, "Kitchen notice archive date"),
    source: notice.source === undefined ? undefined : parseNoticeSource(notice.source),
    linkedReminderId: optionalText(notice.linkedReminderId, "Kitchen notice reminder ID", 180),
    linkedCalendarEventId: optionalText(notice.linkedCalendarEventId, "Kitchen notice calendar ID", 180),
  };
}

export function parseKitchenNoticeboardSnapshot(value: unknown): KitchenNoticeboardSnapshot {
  const snapshot = record(value, "Kitchen noticeboard");
  exact(snapshot, ["schemaVersion", "revision", "notices", "assignees"], "Kitchen noticeboard");
  if (snapshot.schemaVersion !== KITCHEN_NOTICEBOARD_SCHEMA_VERSION) {
    throw new Error("Please update DiaryDock to open the noticeboard.");
  }
  return {
    schemaVersion: KITCHEN_NOTICEBOARD_SCHEMA_VERSION,
    revision: revision(snapshot.revision),
    notices: array(snapshot.notices, "Kitchen notices", 300).map(parseKitchenNotice),
    assignees: array(snapshot.assignees, "Kitchen notice assignees", 100)
      .map((item) => text(item, "Kitchen notice assignee", 120)),
  };
}
