import type { HouseholdChoice, OnboardingAnswers } from "./types.ts";

export function finaliseOnboardingAnswers(
  answers: OnboardingAnswers,
  householdMembers: HouseholdChoice,
): OnboardingAnswers {
  return {
    ...answers,
    householdCollaboration: householdMembers === "Just me" ? "no" : "yes",
    documentStorage: "yes",
    reminders: "yes",
  };
}
