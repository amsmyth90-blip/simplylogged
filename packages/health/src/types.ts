export const HEALTH_SCHEMA_VERSION = 2;

export const bedroomSectionIds = [
  "health-profile",
  "medical-records",
  "medications",
  "appointments",
  "tests",
  "health-timeline",
  "dental-optical",
  "emergency",
  "vaccinations",
  "family-health",
  "contacts",
  "care-preferences",
  "wellbeing",
  "medical-devices",
  "allergies",
  "conditions",
  "procedures",
] as const;

export type BedroomSectionId = (typeof bedroomSectionIds)[number];

export type HealthProfile = {
  bloodGroup: string;
  gpContactId: string;
  pharmacyContactId: string;
  emergencyContactId: string;
  emergencyNotes: string;
  lastReviewedAt: string;
};

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
  type:
    | "appointment"
    | "condition"
    | "medication"
    | "test"
    | "procedure"
    | "vaccination"
    | "document"
    | "other";
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

export type HealthSnapshot = {
  schemaVersion: typeof HEALTH_SCHEMA_VERSION;
  revision: string | null;
  counts: HealthCollectionCounts;
  directory: HealthDirectory;
  health: HealthRecord;
};

export type HealthFamilyProfile = {
  id: string;
  name: string;
  role: string;
};

export type HealthContact = {
  id: string;
  name: string;
  role: string;
  company: string;
  phone: string;
};

export type HealthDirectory = {
  familyProfiles: HealthFamilyProfile[];
  contacts: HealthContact[];
};

export type HealthCollectionCounts = {
  conditions: number;
  allergies: number;
  medications: number;
  appointments: number;
  tests: number;
  vaccinations: number;
  timeline: number;
  dentalOptical: number;
  wellbeing: number;
};
