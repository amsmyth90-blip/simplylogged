import {
  KITCHEN_CALENDAR_SCHEMA_VERSION,
  parseKitchenCalendarEvent,
  parseKitchenCalendarSnapshot,
  type KitchenCalendarEvent,
  type KitchenCalendarMutation,
  type KitchenCalendarSnapshot,
} from "@diarydock/kitchen";

import { jsonUtf8Bytes, utf8Text } from "../serialization/json-size.ts";

type JsonRecord = Record<string, unknown>;
const SNAPSHOT_LIMIT = 256 * 1024;
const STATE_LIMIT = 1_900_000;

export function calendarObject(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord : {};
}

function optional(value: unknown, maximum: number) {
  const candidate = utf8Text(value, maximum, maximum);
  return candidate || undefined;
}

function event(value: unknown): KitchenCalendarEvent | null {
  const item = calendarObject(value);
  try {
    return parseKitchenCalendarEvent({
      id: utf8Text(item.id, 128, 128),
      title: utf8Text(item.title, 160, 160),
      date: item.date,
      time: item.time,
      category: item.category,
      assignedTo: optional(item.assignedTo, 120),
      noticeId: optional(item.noticeId, 128),
    });
  } catch {
    return null;
  }
}

export function projectKitchenCalendar(
  payload: unknown,
  revision: string | null,
): KitchenCalendarSnapshot {
  const root = calendarObject(payload);
  const seen = new Set<string>();
  const events = (Array.isArray(root.familyCalendarEvents) ? root.familyCalendarEvents : [])
    .slice(0, 500).map(event).filter((entry): entry is KitchenCalendarEvent => {
      if (!entry || seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    }).sort((left, right) => `${left.date}${left.time}${left.id}`
      .localeCompare(`${right.date}${right.time}${right.id}`));
  const snapshot = parseKitchenCalendarSnapshot({
    schemaVersion: KITCHEN_CALENDAR_SCHEMA_VERSION,
    revision,
    events,
  });
  if (jsonUtf8Bytes(snapshot) > SNAPSHOT_LIMIT) {
    throw new Error("Kitchen calendar exceeds the safe mobile record limit.");
  }
  return snapshot;
}

type MutationResult = { status: "CAPACITY" | "NOT_FOUND" | "OK"; payload?: JsonRecord };

export function mutateKitchenCalendarPayload(
  payload: unknown,
  mutation: KitchenCalendarMutation,
  createId = () => crypto.randomUUID(),
): MutationResult {
  const root = calendarObject(payload);
  const events = Array.isArray(root.familyCalendarEvents)
    ? [...root.familyCalendarEvents] : [];
  if (mutation.operation === "DELETE_EVENT") {
    const next = events.filter((candidate) => calendarObject(candidate).id !== mutation.eventId);
    if (next.length === events.length) return { status: "NOT_FOUND" };
    const result = { ...root, familyCalendarEvents: next };
    return jsonUtf8Bytes(result) > STATE_LIMIT ? { status: "CAPACITY" }
      : { status: "OK", payload: result };
  }
  if (mutation.eventId === null) {
    if (events.length >= 500) return { status: "CAPACITY" };
    events.push({ id: createId(), ...mutation.event });
  } else {
    const index = events.findIndex((candidate) =>
      calendarObject(candidate).id === mutation.eventId);
    if (index < 0) return { status: "NOT_FOUND" };
    const current = calendarObject(events[index]);
    events[index] = {
      ...current,
      id: mutation.eventId,
      ...mutation.event,
      ...(typeof current.noticeId === "string" ? { noticeId: current.noticeId } : {}),
    };
  }
  const result = { ...root, familyCalendarEvents: events };
  return jsonUtf8Bytes(result) > STATE_LIMIT ? { status: "CAPACITY" }
    : { status: "OK", payload: result };
}
