import {
  applicabilityAnswers,
  homeTenureAnswers,
  type LifeCheckAnswers,
} from "@diarydock/life-check";
import {
  householdChoices,
  normaliseDashboardAreaIds,
  ONBOARDING_SCHEMA_VERSION,
  parseOnboardingSnapshot,
  type OnboardingSnapshot,
} from "@diarydock/onboarding";

type Json = Record<string, unknown>;

function object(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
}
function text(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}
function household(value: unknown) {
  const candidate = text(value, 80);
  return householdChoices.some(({ value: choice }) => choice === candidate) ? candidate : "";
}
function choice<Value extends string>(input: unknown, choices: readonly Value[], fallback: Value) {
  return choices.includes(input as Value) ? input as Value : fallback;
}
function lifeCheckAnswers(onboarding: Json): LifeCheckAnswers {
  const source = object(onboarding.lifeCheck); const completedAt = text(source.completedAt, 40);
  return {
    homeTenure: choice(source.homeTenure, homeTenureAnswers, "not-set"),
    vehicles: choice(source.vehicles, applicabilityAnswers, "not-set"),
    pets: choice(source.pets, applicabilityAnswers, "not-set"),
    internationalTravel: choice(source.internationalTravel, applicabilityAnswers, "not-set"),
    householdCollaboration: choice(source.householdCollaboration, applicabilityAnswers, "not-set"),
    documentStorage: choice(source.documentStorage, applicabilityAnswers, "not-set"),
    reminders: choice(source.reminders, applicabilityAnswers, "not-set"),
    completedAt: Number.isFinite(Date.parse(completedAt)) ? completedAt : null,
  };
}

export function projectOnboardingSnapshot(input: unknown, revision: string | null,
  fallbackProfileName = ""): OnboardingSnapshot {
  const payload = object(input); const onboarding = object(payload.onboarding);
  const profile = object(payload.settingsProfile);
  const profileName = text(profile.name, 160) || text(fallbackProfileName, 160);
  const householdName = text(onboarding.householdName, 160);
  const householdMembers = household(onboarding.householdMembers);
  const selectedAreaIds = normaliseDashboardAreaIds(Array.isArray(onboarding.selectedRooms)
    ? onboarding.selectedRooms.filter((value): value is string => typeof value === "string") : []);
  const lifeCheck = lifeCheckAnswers(onboarding);
  const answersComplete = Object.entries(lifeCheck).every(([key, value]) => key === "completedAt"
    || value !== "not-set");
  const completed = onboarding.completed === true && Boolean(profileName && householdName
    && householdMembers && answersComplete && lifeCheck.completedAt);
  return parseOnboardingSnapshot({ schemaVersion: ONBOARDING_SCHEMA_VERSION, revision, completed,
    dashboardAreasConfigured: onboarding.dashboardAreasConfigured === true,
    profileName, householdName, householdMembers, selectedAreaIds, answers: lifeCheck });
}
