export { householdChoices } from "@diarydock/onboarding";

export const onboardingStepTitles = [
  "Your profile",
  "Your household",
  "Your life",
  "Extra areas",
  "Your dashboard",
] as const;

export function initialsForName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
