import type { LifeCheckAnswers } from "@diarydock/life-check";

export const ONBOARDING_SCHEMA_VERSION = 1;

export type OnboardingAnswers = Omit<LifeCheckAnswers, "completedAt">;

export type OnboardingSnapshot = {
  schemaVersion: typeof ONBOARDING_SCHEMA_VERSION;
  revision: string | null;
  completed: boolean;
  dashboardAreasConfigured: boolean;
  profileName: string;
  householdName: string;
  householdMembers: HouseholdChoice | "";
  selectedAreaIds: string[];
  answers: LifeCheckAnswers;
};

export type OnboardingMutation = {
  revision: string | null;
  profileName: string;
  householdName: string;
  householdMembers: HouseholdChoice;
  selectedAreaIds: string[];
  answers: OnboardingAnswers;
};

export type HouseholdChoice = (typeof householdChoices)[number]["value"];

export const householdChoices = [
  { value: "Just me", title: "Just me", detail: "A private DiaryDock for your own life admin.",
    icon: "heart" },
  { value: "Me and my partner", title: "Me and my partner",
    detail: "Organise personal and shared household information.", icon: "users" },
  { value: "Family with children", title: "Family with children",
    detail: "Include household profiles, plans and family schedules.", icon: "home" },
  { value: "Other shared household", title: "Other household",
    detail: "For relatives, housemates or another shared setup.", icon: "users" },
] as const;
