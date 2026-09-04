import {
  HOUSEHOLD_SCHEDULES_SCHEMA_VERSION,
  householdScheduleColours,
  householdScheduleRepeats,
  type HouseholdScheduleRoutine,
  type HouseholdSchedulesMutation,
  type HouseholdSchedulesSnapshot,
  type SaveHouseholdScheduleRoutine,
} from "./schedule-types.ts";

type UnknownRecord = Record<string, unknown>;

function record(value: unknown, label: string): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} is invalid.`);
  }
  return value as UnknownRecord;
}

function exact(value: UnknownRecord, keys: string[], label: string) {
  if (Object.keys(value).some((key) => !keys.includes(key))) {
    throw new Error(`${label} contains unsupported information.`);
  }
}

function text(value: unknown, label: string, maximum: number, allowEmpty = false) {
  if (typeof value !== "string" || value.length > maximum) {
    throw new Error(`${label} is invalid.`);
  }
  const normalized = value.trim();
  if (!allowEmpty && !normalized) throw new Error(`${label} is invalid.`);
  return normalized;
}

function optionalRevision(value: unknown) {
  return value === null ? null : text(value, "Schedule revision", 40);
}

function identifier(value: unknown, label = "Routine ID") {
  return text(value, label, 128);
}

function time(value: unknown, label: string) {
  const normalized = text(value, label, 5);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(normalized)) {
    throw new Error(`${label} is invalid.`);
  }
  return normalized;
}

function minutes(value: string) {
  const [hours, minute] = value.split(":").map(Number);
  return hours * 60 + minute;
}

export function parseSaveHouseholdScheduleRoutine(
  value: unknown,
): SaveHouseholdScheduleRoutine {
  const item = record(value, "Household routine");
  exact(item, ["title", "childName", "day", "startTime", "endTime", "repeat", "location",
    "responsibleAdult", "transport", "colour", "paused"], "Household routine");
  if (!Number.isSafeInteger(item.day) || Number(item.day) < 0 || Number(item.day) > 6) {
    throw new Error("Routine day is invalid.");
  }
  if (!householdScheduleRepeats.includes(item.repeat as never)) {
    throw new Error("Routine repeat is invalid.");
  }
  if (!householdScheduleColours.includes(item.colour as never)) {
    throw new Error("Routine colour is invalid.");
  }
  if (typeof item.paused !== "boolean") throw new Error("Routine status is invalid.");
  const startTime = time(item.startTime, "Routine start time");
  const endTime = time(item.endTime, "Routine end time");
  if (minutes(endTime) <= minutes(startTime)) {
    throw new Error("Routine finish time must be after its start time.");
  }
  return {
    title: text(item.title, "Routine title", 160),
    childName: text(item.childName, "Routine person", 120),
    day: Number(item.day),
    startTime,
    endTime,
    repeat: item.repeat as SaveHouseholdScheduleRoutine["repeat"],
    location: text(item.location, "Routine location", 240, true),
    responsibleAdult: text(item.responsibleAdult, "Responsible adult", 120, true),
    transport: text(item.transport, "Routine transport", 80, true),
    colour: item.colour as SaveHouseholdScheduleRoutine["colour"],
    paused: item.paused,
  };
}

function parseRoutine(value: unknown): HouseholdScheduleRoutine {
  const item = record(value, "Household routine record");
  exact(item, ["id", "title", "childName", "day", "startTime", "endTime", "repeat",
    "location", "responsibleAdult", "transport", "colour", "paused"],
  "Household routine record");
  return { id: identifier(item.id), ...parseSaveHouseholdScheduleRoutine({
    title: item.title,
    childName: item.childName,
    day: item.day,
    startTime: item.startTime,
    endTime: item.endTime,
    repeat: item.repeat,
    location: item.location,
    responsibleAdult: item.responsibleAdult,
    transport: item.transport,
    colour: item.colour,
    paused: item.paused,
  }) };
}

export function parseHouseholdSchedulesSnapshot(value: unknown): HouseholdSchedulesSnapshot {
  const item = record(value, "Household schedules snapshot");
  exact(item, ["schemaVersion", "revision", "people", "routines"],
    "Household schedules snapshot");
  if (item.schemaVersion !== HOUSEHOLD_SCHEDULES_SCHEMA_VERSION) {
    throw new Error("Please update DiaryDock to open Family Schedules.");
  }
  if (!Array.isArray(item.people) || item.people.length > 50
    || !Array.isArray(item.routines) || item.routines.length > 300) {
    throw new Error("Household schedules are invalid.");
  }
  const people = item.people.map((entry) => text(entry, "Schedule person", 120));
  const routines = item.routines.map(parseRoutine);
  if (new Set(people.map((entry) => entry.toLowerCase())).size !== people.length
    || new Set(routines.map((entry) => entry.id)).size !== routines.length) {
    throw new Error("Household schedules contain duplicate records.");
  }
  return {
    schemaVersion: HOUSEHOLD_SCHEDULES_SCHEMA_VERSION,
    revision: optionalRevision(item.revision),
    people,
    routines,
  };
}

export function parseHouseholdSchedulesMutation(value: unknown): HouseholdSchedulesMutation {
  const item = record(value, "Household schedule update");
  if (item.operation === "SAVE_ROUTINE") {
    exact(item, ["operation", "revision", "routineId", "routine"], "Household schedule update");
    return {
      operation: "SAVE_ROUTINE",
      revision: optionalRevision(item.revision),
      routineId: item.routineId === null ? null : identifier(item.routineId),
      routine: parseSaveHouseholdScheduleRoutine(item.routine),
    };
  }
  if (item.operation === "DELETE_ROUTINE") {
    exact(item, ["operation", "revision", "routineId"], "Household schedule update");
    return {
      operation: "DELETE_ROUTINE",
      revision: optionalRevision(item.revision),
      routineId: identifier(item.routineId),
    };
  }
  throw new Error("Household schedule operation is invalid.");
}
