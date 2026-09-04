import {
  normaliseDashboardAreaIds,
  type HouseholdChoice,
  type OnboardingAnswers,
  type OnboardingSnapshot,
} from "@diarydock/onboarding";

export type OnboardingDraft = {
  profileName: string;
  householdName: string;
  householdMembers: HouseholdChoice | "";
  selectedAreaIds: string[];
  answers: OnboardingAnswers;
};

export const onboardingStepTitles = [
  "Your profile", "Your household", "Your life", "Your preferences",
  "Choose your areas", "Your dashboard",
] as const;

export function draftFromSnapshot(snapshot: OnboardingSnapshot): OnboardingDraft {
  const answers = { homeTenure: snapshot.answers.homeTenure, vehicles: snapshot.answers.vehicles,
    pets: snapshot.answers.pets, internationalTravel: snapshot.answers.internationalTravel,
    householdCollaboration: snapshot.answers.householdCollaboration,
    documentStorage: snapshot.answers.documentStorage, reminders: snapshot.answers.reminders };
  return { profileName: snapshot.profileName, householdName: snapshot.householdName,
    householdMembers: snapshot.householdMembers, selectedAreaIds: snapshot.selectedAreaIds, answers };
}

export function stepIsComplete(step: number, draft: OnboardingDraft) {
  if (step === 0) return Boolean(draft.profileName.trim() && draft.householdName.trim());
  if (step === 1) return Boolean(draft.householdMembers);
  if (step === 2) return draft.answers.homeTenure !== "not-set"
    && draft.answers.vehicles !== "not-set" && draft.answers.pets !== "not-set";
  if (step === 3) return draft.answers.internationalTravel !== "not-set"
    && draft.answers.householdCollaboration !== "not-set"
    && draft.answers.documentStorage !== "not-set" && draft.answers.reminders !== "not-set";
  return true;
}

const areaForAnswer: Partial<Record<keyof OnboardingAnswers, string>> = {
  vehicles: "garage", pets: "garden", internationalTravel: "driveway",
  householdCollaboration: "family-room",
};

export function answerDraft(draft: OnboardingDraft, field: keyof OnboardingAnswers, value: string) {
  const area = areaForAnswer[field];
  const selected = area ? value === "yes" ? [...draft.selectedAreaIds, area]
    : draft.selectedAreaIds.filter((id) => id !== area) : draft.selectedAreaIds;
  return { ...draft, answers: { ...draft.answers, [field]: value },
    selectedAreaIds: normaliseDashboardAreaIds(selected) } as OnboardingDraft;
}

export function householdDraft(draft: OnboardingDraft, householdMembers: HouseholdChoice) {
  const selected = householdMembers === "Just me"
    ? draft.selectedAreaIds.filter((id) => id !== "family-room")
    : [...draft.selectedAreaIds, "family-room"];
  return { ...draft, householdMembers, selectedAreaIds: normaliseDashboardAreaIds(selected) };
}

export function toggleDraftArea(draft: OnboardingDraft, areaId: string) {
  const selected = draft.selectedAreaIds.includes(areaId)
    ? draft.selectedAreaIds.filter((id) => id !== areaId) : [...draft.selectedAreaIds, areaId];
  return { ...draft, selectedAreaIds: normaliseDashboardAreaIds(selected) };
}

export function shouldShowSetup(input: { editing: boolean; loading: boolean; online: boolean;
  snapshot: OnboardingSnapshot | null }) {
  return input.editing || (input.online && !input.snapshot?.completed)
    || (!input.snapshot && input.loading);
}
