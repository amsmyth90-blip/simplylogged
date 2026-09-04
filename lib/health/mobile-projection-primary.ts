import type {
  HealthAllergy,
  HealthAppointment,
  HealthCondition,
  HealthMedication,
  HealthProfile,
} from "@diarydock/health";

import {
  date,
  object,
  oneOf,
  optionalText,
  text,
  timestamp,
} from "./mobile-projection-values.ts";

export function projectHealthProfile(value: unknown): HealthProfile {
  const item = object(value);
  return {
    bloodGroup: text(item.bloodGroup, 20),
    gpContactId: text(item.gpContactId, 128),
    pharmacyContactId: text(item.pharmacyContactId, 128),
    emergencyContactId: text(item.emergencyContactId, 128),
    emergencyNotes: text(item.emergencyNotes, 4_000),
    lastReviewedAt: timestamp(item.lastReviewedAt, true),
  };
}

export function projectCondition(value: unknown): HealthCondition | null {
  const item = object(value);
  const id = text(item.id, 128);
  const name = text(item.name, 200);
  if (!id || !name) return null;
  return {
    id,
    name,
    recordedDate: date(item.recordedDate),
    status: oneOf(item.status, ["current", "past", "not-set"], "not-set"),
    notes: text(item.notes, 4_000),
    createdAt: timestamp(item.createdAt),
  };
}

export function projectAllergy(value: unknown): HealthAllergy | null {
  const item = object(value);
  const id = text(item.id, 128);
  const allergen = text(item.allergen, 200);
  if (!id || !allergen) return null;
  return {
    id,
    allergen,
    reaction: text(item.reaction, 500),
    severity: oneOf(
      item.severity,
      ["not-recorded", "mild", "moderate", "severe-user-recorded"],
      "not-recorded",
    ),
    notes: text(item.notes, 4_000),
    createdAt: timestamp(item.createdAt),
  };
}

export function projectMedication(value: unknown): HealthMedication | null {
  const item = object(value);
  const id = text(item.id, 128);
  const name = text(item.name, 200);
  if (!id || !name) return null;
  return {
    id,
    name,
    dose: text(item.dose, 120),
    frequency: text(item.frequency, 160),
    prescriber: text(item.prescriber, 200),
    status: oneOf(item.status, ["current", "past"], "current"),
    reviewDate: date(item.reviewDate),
    reminderId: optionalText(item.reminderId, 128),
    notes: text(item.notes, 4_000),
    createdAt: timestamp(item.createdAt),
  };
}

export function projectAppointment(value: unknown): HealthAppointment | null {
  const item = object(value);
  const id = text(item.id, 128);
  const title = text(item.title, 200);
  if (!id || !title) return null;
  return {
    id,
    title,
    provider: text(item.provider, 200),
    location: text(item.location, 300),
    date: date(item.date),
    time: text(item.time, 16),
    status: oneOf(item.status, ["planned", "completed", "cancelled"], "planned"),
    preparationNotes: text(item.preparationNotes, 4_000),
    followUpNotes: text(item.followUpNotes, 4_000),
    reminderId: optionalText(item.reminderId, 128),
    createdAt: timestamp(item.createdAt),
  };
}
