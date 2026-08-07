export type HealthProfile = {
  bloodGroup: string;
  gpContactId: string;
  pharmacyContactId: string;
  emergencyContactId: string;
  emergencyNotes: string;
  lastReviewedAt: string;
};

export const bedroomSectionIds = [
  "health-profile", "medical-records", "medications", "appointments", "tests", "health-timeline",
  "dental-optical", "emergency", "vaccinations", "family-health", "contacts", "care-preferences",
  "wellbeing", "medical-devices", "allergies", "conditions", "procedures",
] as const;

export type BedroomSectionId = (typeof bedroomSectionIds)[number];

export type HealthCondition = {
  id: string;
  name: string;
  recordedDate: string;
  status: "current" | "past" | "not-set";
  notes: string;
  createdAt: string;
};

export type HealthAllergy = {
  id: string;
  allergen: string;
  reaction: string;
  severity: "not-recorded" | "mild" | "moderate" | "severe-user-recorded";
  notes: string;
  createdAt: string;
};

export type HealthMedication = {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  prescriber: string;
  status: "current" | "past";
  reviewDate: string;
  reminderId?: string;
  notes: string;
  createdAt: string;
};

export type HealthAppointment = {
  id: string;
  title: string;
  provider: string;
  location: string;
  date: string;
  time: string;
  status: "planned" | "completed" | "cancelled";
  preparationNotes: string;
  followUpNotes: string;
  reminderId?: string;
  createdAt: string;
};

export type HealthTest = {
  id: string;
  title: string;
  provider: string;
  date: string;
  followUpStatus: "not-recorded" | "noted" | "complete";
  notes: string;
  documentId?: string;
  createdAt: string;
};

export type HealthVaccination = {
  id: string;
  name: string;
  provider: string;
  date: string;
  nextDate: string;
  notes: string;
  documentId?: string;
  createdAt: string;
};

export type HealthTimelineEvent = {
  id: string;
  type: "appointment" | "condition" | "medication" | "test" | "procedure" | "vaccination" | "document" | "other";
  title: string;
  date: string;
  notes: string;
  linkedRecordId?: string;
  createdAt: string;
};

export type DentalOpticalRecord = {
  id: string;
  type: "dental" | "optical";
  title: string;
  provider: string;
  date: string;
  nextReviewDate: string;
  notes: string;
  createdAt: string;
};

export type WellbeingNote = {
  id: string;
  title: string;
  date: string;
  sleepHours?: number;
  notes: string;
  createdAt: string;
};

export type HealthRecord = {
  profile: HealthProfile;
  conditions: HealthCondition[];
  allergies: HealthAllergy[];
  medications: HealthMedication[];
  appointments: HealthAppointment[];
  tests: HealthTest[];
  vaccinations: HealthVaccination[];
  timeline: HealthTimelineEvent[];
  dentalOptical: DentalOpticalRecord[];
  wellbeing: WellbeingNote[];
  carePreferences: string;
  familyMemberIds: string[];
  updatedAt: string;
};

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

export function hydrateHealthRecord(record?: Partial<HealthRecord> | null): HealthRecord {
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
  return { completed, total: checks.length, percent: Math.round((completed / checks.length) * 100) };
}
