export const CORE_DASHBOARD_AREA_IDS = ["office", "kitchen", "mailbox", "front-gate"] as const;

export const OPTIONAL_DASHBOARD_AREAS = [
  { roomId: "bedroom", question: "Would you like a private health and wellbeing area?",
    detail: "Health details, medicines, appointments and emergency information." },
  { roomId: "family-room", question: "Do you manage family life with other people?",
    detail: "Household profiles, shared plans and family schedules." },
  { roomId: "garage", question: "Do you own or regularly use a vehicle?",
    detail: "Vehicle details, MOT, insurance, servicing and costs." },
  { roomId: "garden", question: "Do you have pets?",
    detail: "Pet profiles, care, appointments and important records." },
  { roomId: "driveway", question: "Would you like help organising travel?",
    detail: "Trips, travel documents and packing checklists." },
  { roomId: "attic", question: "Would you like to preserve family memories?",
    detail: "Stories, photographs, keepsakes and heirlooms." },
] as const;

export const DASHBOARD_AREA_IDS = [
  ...CORE_DASHBOARD_AREA_IDS,
  ...OPTIONAL_DASHBOARD_AREAS.map(({ roomId }) => roomId),
] as const;

export function normaliseDashboardAreaIds(selectedAreaIds: readonly string[]) {
  const allowed = new Set<string>(OPTIONAL_DASHBOARD_AREAS.map(({ roomId }) => roomId));
  const optional = selectedAreaIds.filter((areaId) => allowed.has(areaId));
  return [...new Set([...CORE_DASHBOARD_AREA_IDS, ...optional])];
}
