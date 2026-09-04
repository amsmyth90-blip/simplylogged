import type { DiaryDockAppState, HouseholdState } from "./diarydock-types.ts";

export const MAX_DIARYDOCK_STATE_SAVE_BYTES = 4 * 1024 * 1024;

export type DiaryDockStateSaveRequest = {
  privateRevision: string | null;
  householdRevision: string | null;
  privateState: DiaryDockAppState;
  householdState: HouseholdState;
};

export type DiaryDockStateSaveResponse = {
  status: "OK" | "CONFLICT";
  privateRevision: string | null;
  householdRevision: string | null;
};

const arrayKeys = [
  "reminders", "vaultDocuments", "householdMembers", "familyInvites",
  "careContacts", "emergencyContacts", "emergencyPlans", "homeInfo",
  "settingsGroups", "mailboxItems", "kitchenItems", "kitchenRecipes",
  "kitchenNoticeboard", "familyCalendarEvents", "kidSchedules",
  "householdProfiles", "familyStories",
] as const;

const objectKeys = [
  "settingsProfile", "roomTasks", "roomDocuments", "roomActivity", "onboarding",
  "mealPlan", "willsWishes", "bills", "insurance", "contracts",
  "correspondence", "professionalContacts", "vehicles", "trips",
  "travelChecklist", "health",
] as const;

const householdArrayKeys = [
  "reminders", "kitchenItems", "kitchenRecipes", "kitchenNoticeboard",
  "familyCalendarEvents", "kidSchedules", "householdProfiles",
] as const;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length
    && actual.every((key, index) => key === wanted[index]);
}

function revision(value: unknown) {
  if (value === null) return null;
  if (typeof value !== "string" || value.length > 40
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    || !Number.isFinite(Date.parse(value))) {
    throw new Error("Invalid state revision.");
  }
  return value;
}

function privateState(value: unknown): DiaryDockAppState {
  if (!record(value)) throw new Error("Invalid private state.");
  const expected = [...arrayKeys, ...objectKeys, "kitchenCookingProgress"];
  if (!exactKeys(value, expected)) throw new Error("Invalid private state shape.");
  if (arrayKeys.some((key) => !Array.isArray(value[key]))) {
    throw new Error("Invalid private state list.");
  }
  if (objectKeys.some((key) => !record(value[key]))) {
    throw new Error("Invalid private state object.");
  }
  if (value.kitchenCookingProgress !== null && !record(value.kitchenCookingProgress)) {
    throw new Error("Invalid cooking progress.");
  }
  return value as DiaryDockAppState;
}

function householdState(value: unknown): HouseholdState {
  if (!record(value)) throw new Error("Invalid household state.");
  const expected = [...householdArrayKeys, "mealPlan"];
  if (!exactKeys(value, expected)
    || householdArrayKeys.some((key) => !Array.isArray(value[key]))
    || !record(value.mealPlan)) {
    throw new Error("Invalid household state shape.");
  }
  return value as HouseholdState;
}

export function parseDiaryDockStateSaveRequest(value: unknown): DiaryDockStateSaveRequest {
  if (!record(value) || !exactKeys(value, [
    "privateRevision", "householdRevision", "privateState", "householdState",
  ])) throw new Error("Invalid state save request.");
  const privatePayload = privateState(value.privateState);
  const householdPayload = householdState(value.householdState);
  for (const key of [...householdArrayKeys, "mealPlan"] as const) {
    if (JSON.stringify(privatePayload[key]) !== JSON.stringify(householdPayload[key])) {
      throw new Error("Private and household state do not match.");
    }
  }
  return {
    privateRevision: revision(value.privateRevision),
    householdRevision: revision(value.householdRevision),
    privateState: privatePayload,
    householdState: householdPayload,
  };
}

export function parseDiaryDockStateSaveResponse(value: unknown): DiaryDockStateSaveResponse {
  if (!record(value) || !exactKeys(value, [
    "status", "privateRevision", "householdRevision",
  ]) || (value.status !== "OK" && value.status !== "CONFLICT")) {
    throw new Error("Invalid state save response.");
  }
  const result = {
    status: value.status === "OK" ? "OK" as const : "CONFLICT" as const,
    privateRevision: revision(value.privateRevision),
    householdRevision: revision(value.householdRevision),
  };
  if (result.status === "OK" && (!result.privateRevision || !result.householdRevision)) {
    throw new Error("Incomplete state save response.");
  }
  return result;
}
