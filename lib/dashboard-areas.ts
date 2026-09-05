import type { OnboardingState } from "@/lib/diarydock-data";
import {
  ADDITIONAL_DASHBOARD_AREAS,
  CORE_DASHBOARD_AREA_IDS,
  normaliseDashboardAreaIds,
  OPTIONAL_DASHBOARD_AREAS,
} from "@diarydock/onboarding";

export {
  ADDITIONAL_DASHBOARD_AREAS,
  CORE_DASHBOARD_AREA_IDS,
  normaliseDashboardAreaIds,
  OPTIONAL_DASHBOARD_AREAS,
};

export function isDashboardAreaVisible(roomId: string, onboarding: OnboardingState) {
  if (CORE_DASHBOARD_AREA_IDS.includes(roomId as (typeof CORE_DASHBOARD_AREA_IDS)[number])) return true;
  if (!onboarding.completed || !onboarding.dashboardAreasConfigured || onboarding.selectedRooms.length === 0) return true;
  return onboarding.selectedRooms.includes(roomId);
}
