import type {
  DentalOpticalRecord,
  HealthTest,
  HealthTimelineEvent,
  HealthVaccination,
  WellbeingNote,
} from "@diarydock/health";

import {
  boundedNumber,
  date,
  object,
  oneOf,
  optionalText,
  text,
  timestamp,
} from "./mobile-projection-values.ts";

export function projectHealthTest(value: unknown): HealthTest | null {
  const item = object(value);
  const id = text(item.id, 128);
  const title = text(item.title, 200);
  if (!id || !title) return null;
  return {
    id,
    title,
    provider: text(item.provider, 200),
    date: date(item.date),
    followUpStatus: oneOf(item.followUpStatus, ["not-recorded", "noted", "complete"], "not-recorded"),
    notes: text(item.notes, 4_000),
    documentId: optionalText(item.documentId, 128),
    createdAt: timestamp(item.createdAt),
  };
}

export function projectVaccination(value: unknown): HealthVaccination | null {
  const item = object(value);
  const id = text(item.id, 128);
  const name = text(item.name, 200);
  if (!id || !name) return null;
  return {
    id,
    name,
    provider: text(item.provider, 200),
    date: date(item.date),
    nextDate: date(item.nextDate),
    notes: text(item.notes, 4_000),
    documentId: optionalText(item.documentId, 128),
    createdAt: timestamp(item.createdAt),
  };
}

export function projectTimeline(value: unknown): HealthTimelineEvent | null {
  const item = object(value);
  const id = text(item.id, 128);
  const title = text(item.title, 200);
  if (!id || !title) return null;
  return {
    id,
    type: oneOf(item.type, ["appointment", "condition", "medication", "test", "procedure", "vaccination", "document", "other"], "other"),
    title,
    date: date(item.date),
    notes: text(item.notes, 4_000),
    linkedRecordId: optionalText(item.linkedRecordId, 128),
    createdAt: timestamp(item.createdAt),
  };
}

export function projectDentalOptical(value: unknown): DentalOpticalRecord | null {
  const item = object(value);
  const id = text(item.id, 128);
  const title = text(item.title, 200);
  if (!id || !title) return null;
  return {
    id,
    type: oneOf(item.type, ["dental", "optical"], "dental"),
    title,
    provider: text(item.provider, 200),
    date: date(item.date),
    nextReviewDate: date(item.nextReviewDate),
    notes: text(item.notes, 4_000),
    createdAt: timestamp(item.createdAt),
  };
}

export function projectWellbeing(value: unknown): WellbeingNote | null {
  const item = object(value);
  const id = text(item.id, 128);
  const title = text(item.title, 200);
  if (!id || !title) return null;
  return {
    id,
    title,
    date: date(item.date),
    sleepHours: boundedNumber(item.sleepHours, 24),
    notes: text(item.notes, 4_000),
    createdAt: timestamp(item.createdAt),
  };
}
