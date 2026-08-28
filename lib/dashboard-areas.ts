import type { OnboardingState } from "@/lib/diarydock-data";

export const CORE_DASHBOARD_AREA_IDS = ["office", "kitchen", "mailbox", "front-gate"] as const;

export const OPTIONAL_DASHBOARD_AREAS = [
  {
    roomId: "bedroom",
    question: "Would you like a private health and wellbeing area?",
    detail: "Health details, medicines, appointments and emergency information."
  },
  {
    roomId: "family-room",
    question: "Do you manage family life with other people?",
    detail: "Household profiles, shared plans and family schedules."
  },
  {
    roomId: "garage",
    question: "Do you own or regularly use a vehicle?",
    detail: "Vehicle details, MOT, insurance, servicing and costs."
  },
  {
    roomId: "garden",
    question: "Do you have pets?",
    detail: "Pet profiles, care, appointments and important records."
  },
  {
    roomId: "driveway",
    question: "Would you like help organising travel?",
    detail: "Trips, travel documents and packing checklists."
  },
  {
    roomId: "attic",
    question: "Would you like to preserve family memories?",
    detail: "Stories, photographs, keepsakes and heirlooms."
  }
] as const;

export function normaliseDashboardAreaIds(selectedRooms: string[]) {
  const allowedOptional = new Set<string>(OPTIONAL_DASHBOARD_AREAS.map((area) => area.roomId));
  const selectedOptional = selectedRooms.filter((roomId) => allowedOptional.has(roomId));
  return [...new Set([...CORE_DASHBOARD_AREA_IDS, ...selectedOptional])];
}

export function isDashboardAreaVisible(roomId: string, onboarding: OnboardingState) {
  if (CORE_DASHBOARD_AREA_IDS.includes(roomId as (typeof CORE_DASHBOARD_AREA_IDS)[number])) return true;
  if (!onboarding.completed || !onboarding.dashboardAreasConfigured || onboarding.selectedRooms.length === 0) return true;
  return onboarding.selectedRooms.includes(roomId);
}
