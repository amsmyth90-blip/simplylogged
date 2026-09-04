import type { HealthMutation } from "@diarydock/health";

import { object } from "./mobile-projection-values.ts";

type JsonRecord = Record<string, unknown>;
type Result =
  | { status: "OK" | "IDEMPOTENT"; payload: JsonRecord }
  | {
      status: "CAPACITY" | "DUPLICATE" | "INVALID_REFERENCE";
      payload: null;
    };

function same(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function add(
  health: JsonRecord,
  collection: string,
  value: { id: string },
): "OK" | "IDEMPOTENT" | "CAPACITY" | "DUPLICATE" {
  const entries = Array.isArray(health[collection]) ? [...health[collection] as unknown[]] : [];
  const existing = entries.find((entry) => object(entry).id === value.id);
  if (existing) return same(existing, value) ? "IDEMPOTENT" : "DUPLICATE";
  if (entries.length >= 10_000) return "CAPACITY";
  health[collection] = [value, ...entries];
  return "OK";
}

const collections = {
  ADD_CONDITION: "conditions",
  ADD_ALLERGY: "allergies",
  ADD_MEDICATION: "medications",
  ADD_APPOINTMENT: "appointments",
  ADD_TEST: "tests",
  ADD_VACCINATION: "vaccinations",
  ADD_DENTAL_OPTICAL: "dentalOptical",
  ADD_WELLBEING: "wellbeing",
} as const;

export function mutateHealthPayload(
  current: unknown,
  mutation: HealthMutation,
): Result {
  const payload = structuredClone(object(current));
  const health = object(payload.health);
  const now = new Date().toISOString();
  if (
    (mutation.operation === "UPDATE_OVERVIEW" ||
      mutation.operation === "UPDATE_PROFILE") &&
    !validContactReferences(payload, mutation.profile)
  ) {
    return { status: "INVALID_REFERENCE", payload: null };
  }
  if (mutation.operation === "UPDATE_OVERVIEW") {
    if (
      same(health.profile, mutation.profile) &&
      health.carePreferences === mutation.carePreferences
    ) {
      return { status: "IDEMPOTENT", payload };
    }
    health.profile = mutation.profile;
    health.carePreferences = mutation.carePreferences;
  } else if (mutation.operation === "UPDATE_PROFILE") {
    if (same(health.profile, mutation.profile)) {
      return { status: "IDEMPOTENT", payload };
    }
    health.profile = mutation.profile;
  } else if (mutation.operation === "UPDATE_CARE_PREFERENCES") {
    if (health.carePreferences === mutation.carePreferences) {
      return { status: "IDEMPOTENT", payload };
    }
    health.carePreferences = mutation.carePreferences;
  } else if (mutation.operation === "UPDATE_FAMILY_MEMBERS") {
    if (!validFamilyReferences(payload, mutation.familyMemberIds)) {
      return { status: "INVALID_REFERENCE", payload: null };
    }
    if (same(health.familyMemberIds, mutation.familyMemberIds)) {
      return { status: "IDEMPOTENT", payload };
    }
    health.familyMemberIds = mutation.familyMemberIds;
  } else if (mutation.operation === "ADD_TIMELINE") {
    const status = add(health, "timeline", mutation.record);
    if (status === "CAPACITY" || status === "DUPLICATE") {
      return { status, payload: null };
    }
    if (status === "IDEMPOTENT") return { status, payload };
  } else {
    const status = add(health, collections[mutation.operation], mutation.record);
    const timelineStatus = add(health, "timeline", mutation.timeline);
    if (status === "CAPACITY" || timelineStatus === "CAPACITY") {
      return { status: "CAPACITY", payload: null };
    }
    if (status === "DUPLICATE" || timelineStatus === "DUPLICATE") {
      return { status: "DUPLICATE", payload: null };
    }
    if (status === "IDEMPOTENT" && timelineStatus === "IDEMPOTENT") {
      return { status: "IDEMPOTENT", payload };
    }
  }
  health.updatedAt = now;
  payload.health = health;
  return { status: "OK", payload };
}

function validContactReferences(
  payload: JsonRecord,
  profile: { gpContactId: string; pharmacyContactId: string; emergencyContactId: string },
) {
  const root = object(payload.professionalContacts);
  const currentProfile = object(object(payload.health).profile);
  const existing = new Set([
    currentProfile.gpContactId,
    currentProfile.pharmacyContactId,
    currentProfile.emergencyContactId,
  ]);
  const ids = new Set(
    (Array.isArray(root.contacts) ? root.contacts : [])
      .filter((entry) => {
        const contact = object(entry);
        return contact.category === "Healthcare" ||
          contact.isEmergencyContact === true ||
          existing.has(contact.id);
      })
      .map((entry) => object(entry).id)
      .filter((id): id is string => typeof id === "string"),
  );
  return [profile.gpContactId, profile.pharmacyContactId, profile.emergencyContactId]
    .every((id) => !id || ids.has(id));
}

function validFamilyReferences(payload: JsonRecord, selected: string[]) {
  const ids = new Set(
    (Array.isArray(payload.householdMembers) ? payload.householdMembers : [])
      .map((entry) => object(entry).id)
      .filter((id): id is string => typeof id === "string"),
  );
  return selected.every((id) => ids.has(id));
}
