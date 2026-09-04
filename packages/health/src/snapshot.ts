import {
  HEALTH_SCHEMA_VERSION,
  type HealthDirectory,
  type HealthRecord,
  type HealthSnapshot,
} from "./types.ts";
import {
  parseAllergy,
  parseAppointment,
  parseCondition,
  parseHealthProfile,
  parseMedication,
} from "./parse-primary.ts";
import {
  parseDentalOptical,
  parseHealthTest,
  parseTimelineEvent,
  parseVaccination,
  parseWellbeing,
} from "./parse-secondary.ts";
import { exact, list, record, revision, text, timestamp } from "./validation.ts";

const healthKeys = [
  "profile",
  "conditions",
  "allergies",
  "medications",
  "appointments",
  "tests",
  "vaccinations",
  "timeline",
  "dentalOptical",
  "wellbeing",
  "carePreferences",
  "familyMemberIds",
  "updatedAt",
];

export function parseHealthRecord(value: unknown): HealthRecord {
  const item = record(value, "Health record");
  exact(item, healthKeys, "Health record");
  return {
    profile: parseHealthProfile(item.profile),
    conditions: list(item.conditions, "Conditions", 500).map(parseCondition),
    allergies: list(item.allergies, "Allergies", 500).map(parseAllergy),
    medications: list(item.medications, "Medications", 500).map(parseMedication),
    appointments: list(item.appointments, "Appointments", 500).map(parseAppointment),
    tests: list(item.tests, "Health tests", 500).map(parseHealthTest),
    vaccinations: list(item.vaccinations, "Vaccinations", 500).map(parseVaccination),
    timeline: list(item.timeline, "Health timeline", 1_000).map(parseTimelineEvent),
    dentalOptical: list(item.dentalOptical, "Dental and optical records", 500).map(parseDentalOptical),
    wellbeing: list(item.wellbeing, "Wellbeing notes", 500).map(parseWellbeing),
    carePreferences: text(item.carePreferences, "Care preferences", 10_000, true),
    familyMemberIds: list(item.familyMemberIds, "Family member IDs", 100).map((id) => text(id, "Family member ID", 128)),
    updatedAt: timestamp(item.updatedAt, "Health record update time", true),
  };
}

export function parseHealthSnapshot(value: unknown): HealthSnapshot {
  const item = record(value, "Health snapshot");
  exact(item, ["schemaVersion", "revision", "counts", "directory", "health"], "Health snapshot");
  if (item.schemaVersion !== HEALTH_SCHEMA_VERSION) {
    throw new Error("Please update DiaryDock to open My Health.");
  }
  return {
    schemaVersion: HEALTH_SCHEMA_VERSION,
    revision: revision(item.revision),
    counts: parseCounts(item.counts),
    directory: parseHealthDirectory(item.directory),
    health: parseHealthRecord(item.health),
  };
}

function parseHealthDirectory(value: unknown): HealthDirectory {
  const item = record(value, "Health directory");
  exact(item, ["familyProfiles", "contacts"], "Health directory");
  const familyProfiles = list(item.familyProfiles, "Health family profiles", 100).map((value) => {
    const profile = record(value, "Health family profile");
    exact(profile, ["id", "name", "role"], "Health family profile");
    return {
      id: text(profile.id, "Health family profile ID", 128),
      name: text(profile.name, "Health family profile name", 160),
      role: text(profile.role, "Health family profile role", 120, true),
    };
  });
  const contacts = list(item.contacts, "Health contacts", 200).map((value) => {
    const contact = record(value, "Health contact");
    exact(contact, ["id", "name", "role", "company", "phone"], "Health contact");
    return {
      id: text(contact.id, "Health contact ID", 128),
      name: text(contact.name, "Health contact name", 160),
      role: text(contact.role, "Health contact role", 160, true),
      company: text(contact.company, "Health contact company", 160, true),
      phone: text(contact.phone, "Health contact phone", 64, true),
    };
  });
  return { familyProfiles, contacts };
}

function parseCounts(value: unknown) {
  const item = record(value, "Health collection counts");
  const keys = ["conditions", "allergies", "medications", "appointments", "tests", "vaccinations", "timeline", "dentalOptical", "wellbeing"];
  exact(item, keys, "Health collection counts");
  return Object.fromEntries(keys.map((key) => {
    const count = item[key];
    if (!Number.isSafeInteger(count) || Number(count) < 0 || Number(count) > 10_000) {
      throw new Error(`Health ${key} count is invalid.`);
    }
    return [key, Number(count)];
  })) as HealthSnapshot["counts"];
}
