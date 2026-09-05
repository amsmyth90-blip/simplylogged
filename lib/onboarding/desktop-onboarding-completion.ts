import {
  finaliseOnboardingAnswers,
  householdChoices,
  normaliseDashboardAreaIds,
} from "@diarydock/onboarding";

import type { DiaryDockAppState } from "../diarydock-types.ts";

export function completeDesktopOnboarding(
  current: DiaryDockAppState,
  completedAt: string,
): DiaryDockAppState | null {
  const household = householdChoices.find(
    ({ value }) => value === current.onboarding.householdMembers,
  );
  if (!household) return null;
  const answers = finaliseOnboardingAnswers(
    current.onboarding.lifeCheck,
    household.value,
  );
  if (Object.values(answers).some((answer) => answer === "not-set")) return null;
  return {
    ...current,
    onboarding: {
      ...current.onboarding,
      completed: true,
      dashboardAreasConfigured: true,
      selectedRooms: normaliseDashboardAreaIds(current.onboarding.selectedRooms),
      lifeCheck: {
        ...answers,
        completedAt,
      },
    },
  };
}
