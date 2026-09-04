import {
  HEALTH_SCHEMA_VERSION,
  createInitialHealthRecord,
  parseHealthSnapshot,
  type HealthRecord,
  type HealthSnapshot,
} from "@diarydock/health";

import {
  projectAllergy,
  projectAppointment,
  projectCondition,
  projectHealthProfile,
  projectMedication,
} from "./mobile-projection-primary.ts";
import {
  projectDentalOptical,
  projectHealthTest,
  projectTimeline,
  projectVaccination,
  projectWellbeing,
} from "./mobile-projection-secondary.ts";
import { projectHealthDirectory } from "./mobile-directory.ts";
import { object, text, timestamp } from "./mobile-projection-values.ts";
import { jsonUtf8Bytes } from "../serialization/json-size.ts";

const SNAPSHOT_LIMIT = 480 * 1024;

function projectList<T>(
  value: unknown,
  maximum: number,
  project: (entry: unknown) => T | null,
) {
  const ids = new Set<string>();
  return (Array.isArray(value) ? value : [])
    .slice(0, maximum)
    .map(project)
    .filter((entry): entry is T => {
      const id = object(entry).id;
      if (typeof id !== "string" || ids.has(id)) return false;
      ids.add(id);
      return true;
    });
}

function projectRecord(value: unknown): HealthRecord {
  const item = object(value);
  return {
    profile: projectHealthProfile(item.profile),
    conditions: projectList(item.conditions, 10_000, projectCondition),
    allergies: projectList(item.allergies, 10_000, projectAllergy),
    medications: projectList(item.medications, 10_000, projectMedication),
    appointments: projectList(item.appointments, 10_000, projectAppointment),
    tests: projectList(item.tests, 10_000, projectHealthTest),
    vaccinations: projectList(item.vaccinations, 10_000, projectVaccination),
    timeline: projectList(item.timeline, 10_000, projectTimeline),
    dentalOptical: projectList(item.dentalOptical, 10_000, projectDentalOptical),
    wellbeing: projectList(item.wellbeing, 10_000, projectWellbeing),
    carePreferences: text(item.carePreferences, 10_000),
    familyMemberIds: [...new Set(
      (Array.isArray(item.familyMemberIds) ? item.familyMemberIds : [])
        .slice(0, 100)
        .map((id) => text(id, 128))
        .filter(Boolean),
    )],
    updatedAt: timestamp(item.updatedAt, true),
  };
}

function collectionCounts(health: HealthRecord) {
  return {
    conditions: health.conditions.length,
    allergies: health.allergies.length,
    medications: health.medications.length,
    appointments: health.appointments.length,
    tests: health.tests.length,
    vaccinations: health.vaccinations.length,
    timeline: health.timeline.length,
    dentalOptical: health.dentalOptical.length,
    wellbeing: health.wellbeing.length,
  };
}

function fitRecord(
  health: HealthRecord,
  revision: string | null,
  directory: HealthSnapshot["directory"],
): HealthRecord {
  const fitted = {
    ...createInitialHealthRecord(),
    profile: health.profile,
    carePreferences: health.carePreferences,
    familyMemberIds: health.familyMemberIds,
    updatedAt: health.updatedAt,
  };
  const counts = collectionCounts(health);
  let size = jsonUtf8Bytes({
    schemaVersion: HEALTH_SCHEMA_VERSION,
    revision,
    counts,
    directory,
    health: fitted,
  });
  const collections = [
    [health.conditions, fitted.conditions],
    [health.allergies, fitted.allergies],
    [health.medications, fitted.medications],
    [health.appointments, fitted.appointments],
    [health.tests, fitted.tests],
    [health.vaccinations, fitted.vaccinations],
    [health.timeline, fitted.timeline],
    [health.dentalOptical, fitted.dentalOptical],
    [health.wellbeing, fitted.wellbeing],
  ] as Array<[unknown[], unknown[]]>;
  let round = 0;
  let added = true;
  while (added) {
    added = false;
    for (const [source, target] of collections) {
      const entry = source[round];
      if (!entry) continue;
      const entrySize = jsonUtf8Bytes(entry) + 1;
      if (size + entrySize > SNAPSHOT_LIMIT) continue;
      target.push(entry);
      size += entrySize;
      added = true;
    }
    round += 1;
  }
  return fitted;
}

export function projectHealthSnapshot(
  payload: unknown,
  revision: string | null,
): HealthSnapshot {
  const root = object(payload);
  const health = projectRecord(root.health);
  const directory = projectHealthDirectory(payload, health);
  return parseHealthSnapshot({
    schemaVersion: HEALTH_SCHEMA_VERSION,
    revision,
    counts: collectionCounts(health),
    directory,
    health: fitRecord(health, revision, directory),
  });
}

export { mutateHealthPayload } from "./mobile-mutation.ts";
