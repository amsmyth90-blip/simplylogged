export {
  ADDITIONAL_DASHBOARD_AREAS,
  CORE_DASHBOARD_AREA_IDS,
  DASHBOARD_AREA_IDS,
  normaliseDashboardAreaIds,
  OPTIONAL_DASHBOARD_AREAS,
} from "./catalogue.ts";
export { finaliseOnboardingAnswers } from "./completion.ts";
export { parseOnboardingMutation, parseOnboardingSnapshot } from "./parser.ts";
export {
  householdChoices,
  ONBOARDING_SCHEMA_VERSION,
  type HouseholdChoice,
  type OnboardingAnswers,
  type OnboardingMutation,
  type OnboardingSnapshot,
} from "./types.ts";
