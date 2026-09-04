import {
  applicabilityAnswers,
  homeTenureAnswers,
  type LifeCheckAnswers,
} from "@diarydock/life-check";

import { DASHBOARD_AREA_IDS, normaliseDashboardAreaIds } from "./catalogue.ts";
import {
  householdChoices,
  ONBOARDING_SCHEMA_VERSION,
  type HouseholdChoice,
  type OnboardingAnswers,
  type OnboardingMutation,
  type OnboardingSnapshot,
} from "./types.ts";

function object(value: unknown, name: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name} is invalid.`);
  return value as Record<string, unknown>;
}
function exact(value: Record<string, unknown>, keys: string[], name: string) {
  const allowed = new Set(keys);
  if (Object.keys(value).some((key) => !allowed.has(key))
    || keys.some((key) => !(key in value))) throw new Error(`${name} is invalid.`);
}
function text(value: unknown, maximum: number, name: string, allowEmpty = false) {
  if (typeof value !== "string" || value.length > maximum || (!allowEmpty && !value.trim())) {
    throw new Error(`${name} is invalid.`);
  }
  return value.trim();
}
function member<Value extends string>(value: unknown, values: readonly Value[], name: string) {
  if (typeof value !== "string" || !values.includes(value as Value)) throw new Error(`${name} is invalid.`);
  return value as Value;
}
function revision(value: unknown) {
  if (value === null) return null;
  if (typeof value !== "string" || value.length > 40 || !Number.isFinite(Date.parse(value))) {
    throw new Error("Onboarding revision is invalid.");
  }
  return value;
}
function answers(value: unknown, complete: boolean, requireCompletionTime = complete): LifeCheckAnswers {
  const item = object(value, "Onboarding answers");
  exact(item, ["homeTenure", "vehicles", "pets", "internationalTravel", "householdCollaboration",
    "documentStorage", "reminders", "completedAt"], "Onboarding answers");
  const result: LifeCheckAnswers = {
    homeTenure: member(item.homeTenure, homeTenureAnswers, "Home answer"),
    vehicles: member(item.vehicles, applicabilityAnswers, "Vehicle answer"),
    pets: member(item.pets, applicabilityAnswers, "Pet answer"),
    internationalTravel: member(item.internationalTravel, applicabilityAnswers, "Travel answer"),
    householdCollaboration: member(item.householdCollaboration, applicabilityAnswers, "Household answer"),
    documentStorage: member(item.documentStorage, applicabilityAnswers, "Document answer"),
    reminders: member(item.reminders, applicabilityAnswers, "Reminder answer"),
    completedAt: item.completedAt === null ? null : revision(item.completedAt),
  };
  if (complete && Object.entries(result).some(([key, current]) => key !== "completedAt"
    && current === "not-set")) throw new Error("Onboarding answers are incomplete.");
  if (requireCompletionTime && !result.completedAt) throw new Error("Onboarding completion is invalid.");
  return result;
}
function areaIds(value: unknown) {
  if (!Array.isArray(value) || value.length < 4 || value.length > DASHBOARD_AREA_IDS.length
    || value.some((item) => typeof item !== "string" || !DASHBOARD_AREA_IDS.includes(item as never))) {
    throw new Error("Onboarding areas are invalid.");
  }
  const normalised = normaliseDashboardAreaIds(value as string[]);
  if (normalised.length !== value.length || normalised.some((item, index) => item !== value[index])) {
    throw new Error("Onboarding areas are invalid.");
  }
  return normalised;
}
function household(value: unknown, allowEmpty: boolean): HouseholdChoice | "" {
  if (allowEmpty && value === "") return "";
  return member(value, householdChoices.map(({ value }) => value), "Household choice");
}

export function parseOnboardingSnapshot(value: unknown): OnboardingSnapshot {
  const item = object(value, "Onboarding response");
  exact(item, ["schemaVersion", "revision", "completed", "dashboardAreasConfigured", "profileName",
    "householdName", "householdMembers", "selectedAreaIds", "answers"], "Onboarding response");
  if (item.schemaVersion !== ONBOARDING_SCHEMA_VERSION || typeof item.completed !== "boolean"
    || typeof item.dashboardAreasConfigured !== "boolean") throw new Error("Onboarding response is invalid.");
  return { schemaVersion: ONBOARDING_SCHEMA_VERSION, revision: revision(item.revision),
    completed: item.completed, dashboardAreasConfigured: item.dashboardAreasConfigured,
    profileName: text(item.profileName, 160, "Profile name", true),
    householdName: text(item.householdName, 160, "Household name", true),
    householdMembers: household(item.householdMembers, true), selectedAreaIds: areaIds(item.selectedAreaIds),
    answers: answers(item.answers, item.completed) };
}

export function parseOnboardingMutation(value: unknown): OnboardingMutation {
  const item = object(value, "Onboarding update");
  exact(item, ["revision", "profileName", "householdName", "householdMembers", "selectedAreaIds",
    "answers"], "Onboarding update");
  const answerInput = object(item.answers, "Onboarding answers");
  exact(answerInput, ["homeTenure", "vehicles", "pets", "internationalTravel",
    "householdCollaboration", "documentStorage", "reminders"], "Onboarding answers");
  const parsed = answers({ ...answerInput, completedAt: null }, true, false);
  const answerValues = { homeTenure: parsed.homeTenure, vehicles: parsed.vehicles, pets: parsed.pets,
    internationalTravel: parsed.internationalTravel,
    householdCollaboration: parsed.householdCollaboration, documentStorage: parsed.documentStorage,
    reminders: parsed.reminders };
  return { revision: revision(item.revision), profileName: text(item.profileName, 160, "Profile name"),
    householdName: text(item.householdName, 160, "Household name"),
    householdMembers: household(item.householdMembers, false) as HouseholdChoice,
    selectedAreaIds: areaIds(item.selectedAreaIds), answers: answerValues as OnboardingAnswers };
}
