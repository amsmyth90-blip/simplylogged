import type {
  DentalOpticalRecord,
  HealthTest,
  HealthTimelineEvent,
  HealthVaccination,
  WellbeingNote,
} from "./types.ts";
import {
  date,
  exact,
  oneOf,
  optionalNumber,
  optionalText,
  record,
  text,
  timestamp,
} from "./validation.ts";

export function parseHealthTest(value: unknown): HealthTest {
  const item = record(value, "Health test");
  exact(item, ["id", "title", "provider", "date", "followUpStatus", "notes", "documentId", "createdAt"], "Health test");
  return {
    id: text(item.id, "Health test ID", 128),
    title: text(item.title, "Health test title", 200),
    provider: text(item.provider, "Health test provider", 200, true),
    date: date(item.date, "Health test date"),
    followUpStatus: oneOf(item.followUpStatus, ["not-recorded", "noted", "complete"], "Follow-up status"),
    notes: text(item.notes, "Health test notes", 4_000, true),
    documentId: optionalText(item.documentId, "Health test document ID", 128),
    createdAt: timestamp(item.createdAt, "Health test created time"),
  };
}

export function parseVaccination(value: unknown): HealthVaccination {
  const item = record(value, "Vaccination");
  exact(item, ["id", "name", "provider", "date", "nextDate", "notes", "documentId", "createdAt"], "Vaccination");
  return {
    id: text(item.id, "Vaccination ID", 128),
    name: text(item.name, "Vaccination name", 200),
    provider: text(item.provider, "Vaccination provider", 200, true),
    date: date(item.date, "Vaccination date"),
    nextDate: date(item.nextDate, "Next vaccination date"),
    notes: text(item.notes, "Vaccination notes", 4_000, true),
    documentId: optionalText(item.documentId, "Vaccination document ID", 128),
    createdAt: timestamp(item.createdAt, "Vaccination created time"),
  };
}

export function parseTimelineEvent(value: unknown): HealthTimelineEvent {
  const item = record(value, "Health timeline event");
  exact(item, ["id", "type", "title", "date", "notes", "linkedRecordId", "createdAt"], "Health timeline event");
  return {
    id: text(item.id, "Timeline event ID", 128),
    type: oneOf(item.type, ["appointment", "condition", "medication", "test", "procedure", "vaccination", "document", "other"], "Timeline event type"),
    title: text(item.title, "Timeline event title", 200),
    date: date(item.date, "Timeline event date"),
    notes: text(item.notes, "Timeline event notes", 4_000, true),
    linkedRecordId: optionalText(item.linkedRecordId, "Linked record ID", 128),
    createdAt: timestamp(item.createdAt, "Timeline event created time"),
  };
}

export function parseDentalOptical(value: unknown): DentalOpticalRecord {
  const item = record(value, "Dental or optical record");
  exact(item, ["id", "type", "title", "provider", "date", "nextReviewDate", "notes", "createdAt"], "Dental or optical record");
  return {
    id: text(item.id, "Dental or optical ID", 128),
    type: oneOf(item.type, ["dental", "optical"], "Dental or optical type"),
    title: text(item.title, "Dental or optical title", 200),
    provider: text(item.provider, "Dental or optical provider", 200, true),
    date: date(item.date, "Dental or optical date"),
    nextReviewDate: date(item.nextReviewDate, "Next review date"),
    notes: text(item.notes, "Dental or optical notes", 4_000, true),
    createdAt: timestamp(item.createdAt, "Dental or optical created time"),
  };
}

export function parseWellbeing(value: unknown): WellbeingNote {
  const item = record(value, "Wellbeing note");
  exact(item, ["id", "title", "date", "sleepHours", "notes", "createdAt"], "Wellbeing note");
  return {
    id: text(item.id, "Wellbeing note ID", 128),
    title: text(item.title, "Wellbeing note title", 200),
    date: date(item.date, "Wellbeing note date"),
    sleepHours: optionalNumber(item.sleepHours, "Sleep hours", 24),
    notes: text(item.notes, "Wellbeing notes", 4_000, true),
    createdAt: timestamp(item.createdAt, "Wellbeing note created time"),
  };
}
