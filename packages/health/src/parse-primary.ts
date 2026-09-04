import type {
  HealthAllergy,
  HealthAppointment,
  HealthCondition,
  HealthMedication,
  HealthProfile,
} from "./types.ts";
import { date, exact, oneOf, optionalText, record, text, timestamp } from "./validation.ts";

export function parseHealthProfile(value: unknown): HealthProfile {
  const item = record(value, "Health profile");
  exact(item, ["bloodGroup", "gpContactId", "pharmacyContactId", "emergencyContactId", "emergencyNotes", "lastReviewedAt"], "Health profile");
  return {
    bloodGroup: text(item.bloodGroup, "Blood group", 20, true),
    gpContactId: text(item.gpContactId, "GP contact ID", 128, true),
    pharmacyContactId: text(item.pharmacyContactId, "Pharmacy contact ID", 128, true),
    emergencyContactId: text(item.emergencyContactId, "Emergency contact ID", 128, true),
    emergencyNotes: text(item.emergencyNotes, "Emergency notes", 4_000, true),
    lastReviewedAt: timestamp(item.lastReviewedAt, "Review time", true),
  };
}

export function parseCondition(value: unknown): HealthCondition {
  const item = record(value, "Condition");
  exact(item, ["id", "name", "recordedDate", "status", "notes", "createdAt"], "Condition");
  return {
    id: text(item.id, "Condition ID", 128),
    name: text(item.name, "Condition name", 200),
    recordedDate: date(item.recordedDate, "Condition date"),
    status: oneOf(item.status, ["current", "past", "not-set"], "Condition status"),
    notes: text(item.notes, "Condition notes", 4_000, true),
    createdAt: timestamp(item.createdAt, "Condition created time"),
  };
}

export function parseAllergy(value: unknown): HealthAllergy {
  const item = record(value, "Allergy");
  exact(item, ["id", "allergen", "reaction", "severity", "notes", "createdAt"], "Allergy");
  return {
    id: text(item.id, "Allergy ID", 128),
    allergen: text(item.allergen, "Allergen", 200),
    reaction: text(item.reaction, "Reaction", 500, true),
    severity: oneOf(item.severity, ["not-recorded", "mild", "moderate", "severe-user-recorded"], "Allergy severity"),
    notes: text(item.notes, "Allergy notes", 4_000, true),
    createdAt: timestamp(item.createdAt, "Allergy created time"),
  };
}

export function parseMedication(value: unknown): HealthMedication {
  const item = record(value, "Medication");
  exact(item, ["id", "name", "dose", "frequency", "prescriber", "status", "reviewDate", "reminderId", "notes", "createdAt"], "Medication");
  return {
    id: text(item.id, "Medication ID", 128),
    name: text(item.name, "Medication name", 200),
    dose: text(item.dose, "Medication dose", 120, true),
    frequency: text(item.frequency, "Medication frequency", 160, true),
    prescriber: text(item.prescriber, "Prescriber", 200, true),
    status: oneOf(item.status, ["current", "past"], "Medication status"),
    reviewDate: date(item.reviewDate, "Medication review date"),
    reminderId: optionalText(item.reminderId, "Medication reminder ID", 128),
    notes: text(item.notes, "Medication notes", 4_000, true),
    createdAt: timestamp(item.createdAt, "Medication created time"),
  };
}

export function parseAppointment(value: unknown): HealthAppointment {
  const item = record(value, "Appointment");
  exact(item, ["id", "title", "provider", "location", "date", "time", "status", "preparationNotes", "followUpNotes", "reminderId", "createdAt"], "Appointment");
  return {
    id: text(item.id, "Appointment ID", 128),
    title: text(item.title, "Appointment title", 200),
    provider: text(item.provider, "Appointment provider", 200, true),
    location: text(item.location, "Appointment location", 300, true),
    date: date(item.date, "Appointment date"),
    time: text(item.time, "Appointment time", 16, true),
    status: oneOf(item.status, ["planned", "completed", "cancelled"], "Appointment status"),
    preparationNotes: text(item.preparationNotes, "Preparation notes", 4_000, true),
    followUpNotes: text(item.followUpNotes, "Follow-up notes", 4_000, true),
    reminderId: optionalText(item.reminderId, "Appointment reminder ID", 128),
    createdAt: timestamp(item.createdAt, "Appointment created time"),
  };
}
