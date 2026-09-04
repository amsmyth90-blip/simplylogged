import {
  HOUSEHOLD_SCHEDULES_SCHEMA_VERSION,
  householdScheduleColours,
  householdScheduleRepeats,
  parseHouseholdSchedulesSnapshot,
  parseSaveHouseholdScheduleRoutine,
  type HouseholdScheduleRoutine,
  type HouseholdSchedulesSnapshot,
} from "@diarydock/household";

import { jsonUtf8Bytes, utf8Text } from "../serialization/json-size.ts";

type JsonRecord = Record<string, unknown>;
const SNAPSHOT_LIMIT = 480 * 1024;

export function scheduleObject(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function text(value: unknown, maximum: number) {
  return utf8Text(value, maximum, maximum);
}

function routine(value: unknown): HouseholdScheduleRoutine | null {
  const item = scheduleObject(value);
  const id = text(item.id, 128);
  if (!id) return null;
  try {
    return {
      id,
      ...parseSaveHouseholdScheduleRoutine({
        title: text(item.title, 160),
        childName: text(item.childName, 120),
        day: item.day,
        startTime: text(item.startTime, 5),
        endTime: text(item.endTime, 5),
        repeat: householdScheduleRepeats.includes(item.repeat as never)
          ? item.repeat : "weekly",
        location: text(item.location, 240),
        responsibleAdult: text(item.responsibleAdult, 120),
        transport: text(item.transport, 80),
        colour: householdScheduleColours.includes(item.colour as never)
          ? item.colour : "sage",
        paused: item.paused === true,
      }),
    };
  } catch {
    return null;
  }
}

function profileName(value: unknown) {
  const item = scheduleObject(value);
  return item.showInSchedules === true ? text(item.name, 120) : "";
}

function uniquePeople(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLocaleLowerCase("en-GB");
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 50);
}

export function projectHouseholdSchedulesSnapshot(
  payload: unknown,
  revision: string | null,
): HouseholdSchedulesSnapshot {
  const root = scheduleObject(payload);
  const seen = new Set<string>();
  const routines = (Array.isArray(root.kidSchedules) ? root.kidSchedules : [])
    .slice(0, 300)
    .map(routine)
    .filter((entry): entry is HouseholdScheduleRoutine => {
      if (!entry || seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    });
  const profileNames = (Array.isArray(root.householdProfiles) ? root.householdProfiles : [])
    .slice(0, 50).map(profileName);
  const snapshot = parseHouseholdSchedulesSnapshot({
    schemaVersion: HOUSEHOLD_SCHEDULES_SCHEMA_VERSION,
    revision,
    people: uniquePeople([...profileNames, ...routines.map((entry) => entry.childName)]),
    routines,
  });
  if (jsonUtf8Bytes(snapshot) > SNAPSHOT_LIMIT) {
    throw new Error("Household schedules exceed the safe mobile record limit.");
  }
  return snapshot;
}
