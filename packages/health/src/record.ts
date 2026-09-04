import type { HealthProfile, HealthRecord } from "./types.ts";

export const emptyHealthProfile: HealthProfile = {
  bloodGroup: "",
  gpContactId: "",
  pharmacyContactId: "",
  emergencyContactId: "",
  emergencyNotes: "",
  lastReviewedAt: "",
};

export function createInitialHealthRecord(): HealthRecord {
  return {
    profile: { ...emptyHealthProfile },
    conditions: [],
    allergies: [],
    medications: [],
    appointments: [],
    tests: [],
    vaccinations: [],
    timeline: [],
    dentalOptical: [],
    wellbeing: [],
    carePreferences: "",
    familyMemberIds: [],
    updatedAt: "",
  };
}

export function hydrateHealthRecord(
  record?: Partial<HealthRecord> | null,
): HealthRecord {
  const initial = createInitialHealthRecord();
  return {
    ...initial,
    ...record,
    profile: { ...initial.profile, ...(record?.profile ?? {}) },
    conditions: record?.conditions ?? [],
    allergies: record?.allergies ?? [],
    medications: record?.medications ?? [],
    appointments: record?.appointments ?? [],
    tests: record?.tests ?? [],
    vaccinations: record?.vaccinations ?? [],
    timeline: record?.timeline ?? [],
    dentalOptical: record?.dentalOptical ?? [],
    wellbeing: record?.wellbeing ?? [],
    familyMemberIds: record?.familyMemberIds ?? [],
  };
}

export function healthProfileProgress(record: HealthRecord) {
  const checks = [
    Boolean(record.profile.gpContactId),
    Boolean(record.profile.emergencyContactId),
    record.allergies.length > 0,
    record.conditions.length > 0,
    record.medications.length > 0,
    Boolean(record.profile.lastReviewedAt),
  ];
  const completed = checks.filter(Boolean).length;
  return {
    completed,
    total: checks.length,
    percent: Math.round((completed / checks.length) * 100),
  };
}
