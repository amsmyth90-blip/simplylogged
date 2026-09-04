import { exact, record, revision, text } from "./helpers.ts";
import { parseNoticeCategory, parseNoticeColour, parseNoticeSource } from "./notice-parser.ts";
import type { KitchenNoticeMutation } from "./notice-types.ts";

function boolean(value: unknown, label: string) {
  if (typeof value !== "boolean") throw new Error(`${label} is invalid.`);
  return value;
}

function optionalId(value: unknown) {
  return value === null ? null : text(value, "Kitchen notice ID", 160);
}

export function parseKitchenNoticeMutation(value: unknown): KitchenNoticeMutation {
  const mutation = record(value, "Kitchen notice update");
  if (mutation.operation === "SAVE_NOTICE") {
    exact(mutation, ["operation", "revision", "noticeId", "title", "detail", "category",
      "assignedTo", "due", "colour", "pinned", "completed", "source", "linkReminder",
      "linkCalendar"], "Kitchen notice update");
    if (typeof mutation.detail !== "string" || mutation.detail.length > 120
      || typeof mutation.due !== "string" || mutation.due.length > 60) {
      throw new Error("Kitchen notice details are invalid.");
    }
    return {
      operation: "SAVE_NOTICE",
      revision: revision(mutation.revision),
      noticeId: optionalId(mutation.noticeId),
      title: text(mutation.title, "Kitchen notice title", 54),
      detail: mutation.detail.trim(),
      category: parseNoticeCategory(mutation.category),
      assignedTo: text(mutation.assignedTo, "Kitchen notice assignee", 120),
      due: mutation.due.trim(),
      colour: parseNoticeColour(mutation.colour),
      pinned: boolean(mutation.pinned, "Kitchen notice pin state"),
      completed: boolean(mutation.completed, "Kitchen notice completion state"),
      source: parseNoticeSource(mutation.source),
      linkReminder: boolean(mutation.linkReminder, "Kitchen notice reminder choice"),
      linkCalendar: boolean(mutation.linkCalendar, "Kitchen notice calendar choice"),
    };
  }
  if (mutation.operation === "SET_NOTICE_STATE") {
    exact(mutation, ["operation", "revision", "noticeId", "state"], "Kitchen notice update");
    const state = mutation.state;
    if (state !== "PINNED" && state !== "UNPINNED" && state !== "COMPLETED"
      && state !== "OPEN" && state !== "ARCHIVED" && state !== "RESTORED") {
      throw new Error("Kitchen notice state is invalid.");
    }
    return {
      operation: "SET_NOTICE_STATE",
      revision: revision(mutation.revision),
      noticeId: text(mutation.noticeId, "Kitchen notice ID", 160),
      state,
    };
  }
  throw new Error("Kitchen notice update operation is invalid.");
}
