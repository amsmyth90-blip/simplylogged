import type { HealthMutation } from "./mutation-types.ts";
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
import { exact, list, record, revision, text } from "./validation.ts";

const recordKeys = ["operation", "revision", "record", "timeline"];

export function parseHealthMutation(value: unknown): HealthMutation {
  const item = record(value, "Health update");
  const operation = item.operation;
  const parsedRevision = revision(item.revision);
  if (operation === "UPDATE_OVERVIEW") {
    exact(
      item,
      ["operation", "revision", "profile", "carePreferences"],
      "Health update",
    );
    return {
      operation,
      revision: parsedRevision,
      profile: parseHealthProfile(item.profile),
      carePreferences: text(
        item.carePreferences,
        "Care preferences",
        10_000,
        true,
      ),
    };
  }
  if (operation === "UPDATE_PROFILE") {
    exact(item, ["operation", "revision", "profile"], "Health update");
    return { operation, revision: parsedRevision, profile: parseHealthProfile(item.profile) };
  }
  if (operation === "UPDATE_CARE_PREFERENCES") {
    exact(item, ["operation", "revision", "carePreferences"], "Health update");
    return {
      operation,
      revision: parsedRevision,
      carePreferences: text(item.carePreferences, "Care preferences", 10_000, true),
    };
  }
  if (operation === "UPDATE_FAMILY_MEMBERS") {
    exact(item, ["operation", "revision", "familyMemberIds"], "Health update");
    const ids = list(item.familyMemberIds, "Family member IDs", 100).map((id) =>
      text(id, "Family member ID", 128),
    );
    if (new Set(ids).size !== ids.length) {
      throw new Error("Family member IDs must be unique.");
    }
    return { operation, revision: parsedRevision, familyMemberIds: ids };
  }
  if (operation === "ADD_TIMELINE") {
    exact(item, ["operation", "revision", "record"], "Health update");
    return { operation, revision: parsedRevision, record: parseTimelineEvent(item.record) };
  }
  exact(item, recordKeys, "Health update");
  const timeline = parseTimelineEvent(item.timeline);
  if (operation === "ADD_CONDITION") {
    return { operation, revision: parsedRevision, record: parseCondition(item.record), timeline };
  }
  if (operation === "ADD_ALLERGY") {
    return { operation, revision: parsedRevision, record: parseAllergy(item.record), timeline };
  }
  if (operation === "ADD_MEDICATION") {
    return { operation, revision: parsedRevision, record: parseMedication(item.record), timeline };
  }
  if (operation === "ADD_APPOINTMENT") {
    return { operation, revision: parsedRevision, record: parseAppointment(item.record), timeline };
  }
  if (operation === "ADD_TEST") {
    return { operation, revision: parsedRevision, record: parseHealthTest(item.record), timeline };
  }
  if (operation === "ADD_VACCINATION") {
    return { operation, revision: parsedRevision, record: parseVaccination(item.record), timeline };
  }
  if (operation === "ADD_DENTAL_OPTICAL") {
    return { operation, revision: parsedRevision, record: parseDentalOptical(item.record), timeline };
  }
  if (operation === "ADD_WELLBEING") {
    return { operation, revision: parsedRevision, record: parseWellbeing(item.record), timeline };
  }
  throw new Error("Health update operation is invalid.");
}
