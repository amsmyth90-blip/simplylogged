import { array, exact, optionalText, record, revision, text } from "./helpers.ts";
import {
  KITCHEN_CALENDAR_SCHEMA_VERSION,
  kitchenCalendarCategories,
  type KitchenCalendarCategory,
  type KitchenCalendarEvent,
  type KitchenCalendarMutation,
  type KitchenCalendarSnapshot,
} from "./calendar-types.ts";

function category(value: unknown): KitchenCalendarCategory {
  if (!kitchenCalendarCategories.includes(value as KitchenCalendarCategory)) {
    throw new Error("Calendar category is invalid.");
  }
  return value as KitchenCalendarCategory;
}

function date(value: unknown) {
  const candidate = text(value, "Calendar date", 10);
  const parsed = new Date(`${candidate}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate) || Number.isNaN(parsed.getTime())
    || parsed.toISOString().slice(0, 10) !== candidate) {
    throw new Error("Calendar date is invalid.");
  }
  return candidate;
}

function time(value: unknown) {
  const candidate = text(value, "Calendar time", 5);
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(candidate)) {
    throw new Error("Calendar time is invalid.");
  }
  return candidate;
}

export function parseKitchenCalendarEvent(value: unknown): KitchenCalendarEvent {
  const event = record(value, "Calendar event");
  exact(event, ["id", "title", "date", "time", "category", "assignedTo", "noticeId"],
    "Calendar event");
  const assignedTo = optionalText(event.assignedTo, "Calendar assignee", 120);
  const noticeId = optionalText(event.noticeId, "Calendar notice ID", 128);
  return {
    id: text(event.id, "Calendar event ID", 128),
    title: text(event.title, "Calendar event title", 160),
    date: date(event.date),
    time: time(event.time),
    category: category(event.category),
    ...(assignedTo ? { assignedTo } : {}),
    ...(noticeId ? { noticeId } : {}),
  };
}

function eventInput(value: unknown) {
  const event = record(value, "Calendar event update");
  exact(event, ["title", "date", "time", "category", "assignedTo"], "Calendar event update");
  const assignedTo = optionalText(event.assignedTo, "Calendar assignee", 120);
  return {
    title: text(event.title, "Calendar event title", 160),
    date: date(event.date),
    time: time(event.time),
    category: category(event.category),
    ...(assignedTo ? { assignedTo } : {}),
  };
}

export function parseKitchenCalendarSnapshot(value: unknown): KitchenCalendarSnapshot {
  const snapshot = record(value, "Kitchen calendar");
  exact(snapshot, ["schemaVersion", "revision", "events"], "Kitchen calendar");
  if (snapshot.schemaVersion !== KITCHEN_CALENDAR_SCHEMA_VERSION) {
    throw new Error("Please update DiaryDock to open the Kitchen calendar.");
  }
  const events = array(snapshot.events, "Calendar events", 500).map(parseKitchenCalendarEvent);
  if (new Set(events.map((event) => event.id)).size !== events.length) {
    throw new Error("Kitchen calendar contains duplicate events.");
  }
  return { schemaVersion: KITCHEN_CALENDAR_SCHEMA_VERSION,
    revision: revision(snapshot.revision), events };
}

export function parseKitchenCalendarMutation(value: unknown): KitchenCalendarMutation {
  const mutation = record(value, "Kitchen calendar update");
  const parsedRevision = revision(mutation.revision);
  if (mutation.operation === "SAVE_EVENT") {
    exact(mutation, ["operation", "revision", "eventId", "event"], "Kitchen calendar update");
    return {
      operation: "SAVE_EVENT",
      revision: parsedRevision,
      eventId: mutation.eventId === null ? null : text(mutation.eventId, "Calendar event ID", 128),
      event: eventInput(mutation.event),
    };
  }
  if (mutation.operation === "DELETE_EVENT") {
    exact(mutation, ["operation", "revision", "eventId"], "Kitchen calendar update");
    return { operation: "DELETE_EVENT", revision: parsedRevision,
      eventId: text(mutation.eventId, "Calendar event ID", 128) };
  }
  throw new Error("Kitchen calendar update operation is invalid.");
}
