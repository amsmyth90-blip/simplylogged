import { createInitialWillRecord } from "./will-record.ts";
import { parseLetterContentVersion, parseLetterDraft } from "./parse-letter.ts";
import { parseMobileWillRecord, parseMobileWillVersion } from "./parse-will.ts";
import { parseWishesPreferencesDraft } from "./parse-wishes.ts";
import type { WillDetails, WillsMutation } from "./mutation-types.ts";
import { willPreparationSections } from "./will-types.ts";
import {
  date,
  exact,
  oneOf,
  record,
  revision,
  text,
  timestamp,
} from "./validation.ts";

const detailKeys = [
  "solicitorName", "solicitorFirm", "solicitorPhone", "solicitorEmail",
  "referenceNumber", "originalLocationType", "originalLocationDetails",
  "originalOrganisation", "originalContactName", "originalPhone", "originalEmail",
  "originalReferenceNumber", "originalAccessNotes", "originalTrustedPeople",
  "primaryExecutor", "backupExecutor", "trustedPersonInformed", "notes",
] as const;

function parseDetails(value: unknown): WillDetails {
  const item = record(value, "Will details");
  exact(item, detailKeys, "Will details");
  const initial = createInitialWillRecord();
  const parsed = parseMobileWillRecord({
    ...initial,
    ...item,
  });
  return Object.fromEntries(detailKeys.map((key) => [key, parsed[key]])) as WillDetails;
}

function parsePreparationItem(value: unknown) {
  const item = record(value, "Will preparation item");
  exact(item, ["status", "confirmedData", "updatedAt"], "Will preparation item");
  return {
    status: oneOf(item.status, ["not-started", "in-progress", "complete"], "Will preparation status"),
    confirmedData: text(item.confirmedData, "Will preparation notes", 10_000, true),
    updatedAt: timestamp(item.updatedAt, "Will preparation update time", true),
  };
}

export function parseWillsMutation(value: unknown): WillsMutation {
  const item = record(value, "Wills update");
  const parsedRevision = revision(item.revision);
  if (item.operation === "UPDATE_WISHES") {
    exact(item, ["operation", "revision", "preferences"], "Wills update");
    return {
      operation: item.operation,
      revision: parsedRevision,
      preferences: parseWishesPreferencesDraft(item.preferences),
    };
  }
  if (item.operation === "UPDATE_DETAILS") {
    exact(item, ["operation", "revision", "details"], "Wills update");
    return { operation: item.operation, revision: parsedRevision, details: parseDetails(item.details) };
  }
  if (item.operation === "UPDATE_PREPARATION") {
    exact(item, ["operation", "revision", "key", "item"], "Wills update");
    return {
      operation: item.operation,
      revision: parsedRevision,
      key: oneOf(item.key, willPreparationSections.map(({ key }) => key), "Will preparation key"),
      item: parsePreparationItem(item.item),
    };
  }
  if (item.operation === "ADD_WILL_VERSION") {
    exact(item, ["operation", "revision", "version"], "Wills update");
    return { operation: item.operation, revision: parsedRevision, version: parseMobileWillVersion(item.version) };
  }
  if (item.operation === "SET_CURRENT_VERSION") {
    exact(item, ["operation", "revision", "versionId"], "Wills update");
    return { operation: item.operation, revision: parsedRevision, versionId: text(item.versionId, "Will version ID", 128) };
  }
  if (item.operation === "REVIEW_VERSION") {
    exact(item, ["operation", "revision", "versionId", "review", "note"], "Wills update");
    return {
      operation: item.operation,
      revision: parsedRevision,
      versionId: text(item.versionId, "Will version ID", 128),
      review: oneOf(item.review, ["unreviewed", "confirmed", "incorrect"], "Will summary review"),
      note: text(item.note, "Will summary review note", 4_000, true),
    };
  }
  if (item.operation === "MARK_REVIEWED") {
    exact(item, ["operation", "revision", "reviewedAt", "nextReviewAt"], "Wills update");
    return {
      operation: item.operation,
      revision: parsedRevision,
      reviewedAt: date(item.reviewedAt, "Will reviewed date", false),
      nextReviewAt: date(item.nextReviewAt, "Will next-review date"),
    };
  }
  if (item.operation === "UPSERT_LETTER") {
    exact(item, ["operation", "revision", "letter", "version"], "Wills update");
    const letter = parseLetterDraft(item.letter);
    const version = parseLetterContentVersion(item.version);
    if (version.title !== letter.title || version.content !== letter.content) {
      throw new Error("Letter version must match the saved letter.");
    }
    return { operation: item.operation, revision: parsedRevision, letter, version };
  }
  if (item.operation === "RESTORE_LETTER_VERSION") {
    exact(item, ["operation", "revision", "letterId", "versionId", "newVersionId", "createdAt"], "Wills update");
    return {
      operation: item.operation,
      revision: parsedRevision,
      letterId: text(item.letterId, "Letter ID", 128),
      versionId: text(item.versionId, "Letter version ID", 128),
      newVersionId: text(item.newVersionId, "New letter version ID", 128),
      createdAt: timestamp(item.createdAt, "Letter restore time"),
    };
  }
  throw new Error("Wills update operation is invalid.");
}
