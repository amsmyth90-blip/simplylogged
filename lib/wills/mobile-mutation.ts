import type {
  LetterContentVersion,
  LetterDraft,
  MobileWillVersion,
  WillsMutation,
} from "@diarydock/wills";
import { wishesPreferenceKeys } from "@diarydock/wills";

import { object } from "./projection-values.ts";

type JsonRecord = Record<string, unknown>;
type Result =
  | { status: "OK" | "IDEMPOTENT"; payload: JsonRecord }
  | { status: "CAPACITY" | "DUPLICATE" | "NOT_FOUND"; payload: null };

const detailKeys = [
  "solicitorName", "solicitorFirm", "solicitorPhone", "solicitorEmail",
  "referenceNumber", "originalLocationType", "originalLocationDetails",
  "originalOrganisation", "originalContactName", "originalPhone", "originalEmail",
  "originalReferenceNumber", "originalAccessNotes", "originalTrustedPeople",
  "primaryExecutor", "backupExecutor", "trustedPersonInformed", "notes",
] as const;

function same(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function storedVersion(version: MobileWillVersion) {
  return {
    ...version,
    ...(version.detectedSummary ? {
      detectedSummary: { ...version.detectedSummary, extractedText: "" },
    } : {}),
  };
}

function updateCurrent(will: JsonRecord, versionId: string) {
  const versions = Array.isArray(will.versions) ? will.versions : [];
  if (!versions.some((entry) => object(entry).id === versionId)) return false;
  will.currentVersionId = versionId;
  will.versions = versions.map((entry) => {
    const version = object(entry);
    const selected = version.id === versionId;
    return {
      ...version,
      isCurrent: selected,
      currentConfirmed: selected ? true : version.currentConfirmed,
      status: selected && version.status === "superseded"
        ? "signed"
        : !selected && version.isCurrent && version.status !== "draft"
          ? "superseded"
          : version.status,
    };
  });
  return true;
}

function upsertLetter(
  letters: JsonRecord,
  letter: LetterDraft,
  version: LetterContentVersion,
) {
  const entries = Array.isArray(letters.letters) ? [...letters.letters] : [];
  const index = entries.findIndex((entry) => object(entry).id === letter.id);
  if (index < 0 && entries.length >= 10_000) return "CAPACITY" as const;
  const existing = index >= 0 ? object(entries[index]) : {};
  const versions = Array.isArray(existing.versions) ? [...existing.versions] : [];
  const priorVersion = versions.find((entry) => object(entry).id === version.id);
  if (priorVersion && !same(priorVersion, version)) return "DUPLICATE" as const;
  const nextVersions = priorVersion ? versions : [...versions, version];
  if (nextVersions.length > 10_000) return "CAPACITY" as const;
  const next = {
    ...letter,
    versions: nextVersions,
    createdAt: typeof existing.createdAt === "string" ? existing.createdAt : version.createdAt,
    updatedAt: version.createdAt,
  };
  if (index >= 0 && same(existing, next)) return "IDEMPOTENT" as const;
  if (index >= 0) entries[index] = next;
  else entries.unshift(next);
  letters.letters = entries;
  return "OK" as const;
}

function restoreLetterVersion(
  letters: JsonRecord,
  mutation: Extract<WillsMutation, { operation: "RESTORE_LETTER_VERSION" }>,
) {
  const entries = Array.isArray(letters.letters) ? [...letters.letters] : [];
  const letterIndex = entries.findIndex((entry) => object(entry).id === mutation.letterId);
  if (letterIndex < 0) return "NOT_FOUND" as const;
  const letter = object(entries[letterIndex]);
  const versions = Array.isArray(letter.versions) ? [...letter.versions] : [];
  const source = object(versions.find((entry) => object(entry).id === mutation.versionId));
  if (!source.id) return "NOT_FOUND" as const;
  const existing = object(versions.find((entry) => object(entry).id === mutation.newVersionId));
  if (existing.id) {
    const replayed = existing.createdAt === mutation.createdAt &&
      existing.title === source.title && existing.content === source.content &&
      existing.envelopeTitle === source.envelopeTitle &&
      existing.envelopeMessage === source.envelopeMessage;
    return replayed ? "IDEMPOTENT" as const : "DUPLICATE" as const;
  }
  if (versions.length >= 10_000) return "CAPACITY" as const;
  const maximum = versions.reduce((value, entry) => {
    const candidate = Number(object(entry).versionNumber);
    return Number.isSafeInteger(candidate) ? Math.max(value, candidate) : value;
  }, 0);
  const restored = {
    id: mutation.newVersionId,
    versionNumber: maximum + 1,
    createdAt: mutation.createdAt,
    title: source.title,
    content: source.content,
    envelopeTitle: source.envelopeTitle,
    envelopeMessage: source.envelopeMessage,
  };
  entries[letterIndex] = {
    ...letter,
    title: restored.title,
    content: restored.content,
    envelopeTitle: restored.envelopeTitle,
    envelopeMessage: restored.envelopeMessage,
    versions: [...versions, restored],
    updatedAt: mutation.createdAt,
  };
  letters.letters = entries;
  return "OK" as const;
}

export function mutateWillsPayload(current: unknown, mutation: WillsMutation): Result {
  const payload = structuredClone(object(current));
  const wishes = object(payload.willsWishes);
  const will = object(wishes.myWill);
  const letters = object(wishes.lettersOfWishes);
  const now = new Date().toISOString();

  if (mutation.operation === "UPDATE_WISHES") {
    if (wishesPreferenceKeys.every((key) => same(wishes[key], mutation.preferences[key]))) {
      return { status: "IDEMPOTENT", payload };
    }
    for (const key of wishesPreferenceKeys) wishes[key] = mutation.preferences[key];
    wishes.updatedAt = now;
    wishes.myWill = will;
    wishes.lettersOfWishes = letters;
    payload.willsWishes = wishes;
    return { status: "OK", payload };
  }
  if (mutation.operation === "UPDATE_DETAILS") {
    if (detailKeys.every((key) => same(will[key], mutation.details[key]))) {
      return { status: "IDEMPOTENT", payload };
    }
    for (const key of detailKeys) will[key] = mutation.details[key];
  } else if (mutation.operation === "UPDATE_PREPARATION") {
    const preparation = object(will.preparation);
    if (same(preparation[mutation.key], mutation.item)) return { status: "IDEMPOTENT", payload };
    preparation[mutation.key] = mutation.item;
    will.preparation = preparation;
  } else if (mutation.operation === "ADD_WILL_VERSION") {
    const versions = Array.isArray(will.versions) ? [...will.versions] : [];
    const existing = versions.find((entry) => object(entry).id === mutation.version.id);
    const stored = storedVersion(mutation.version);
    if (existing) return same(existing, stored)
      ? { status: "IDEMPOTENT", payload }
      : { status: "DUPLICATE", payload: null };
    if (versions.length >= 10_000) return { status: "CAPACITY", payload: null };
    will.versions = [stored, ...versions];
    if (!will.currentVersionId || mutation.version.isCurrent) updateCurrent(will, mutation.version.id);
  } else if (mutation.operation === "SET_CURRENT_VERSION") {
    if (will.currentVersionId === mutation.versionId) return { status: "IDEMPOTENT", payload };
    if (!updateCurrent(will, mutation.versionId)) return { status: "NOT_FOUND", payload: null };
  } else if (mutation.operation === "REVIEW_VERSION") {
    const versions = Array.isArray(will.versions) ? [...will.versions] : [];
    const index = versions.findIndex((entry) => object(entry).id === mutation.versionId);
    if (index < 0) return { status: "NOT_FOUND", payload: null };
    const version = object(versions[index]);
    if (version.summaryReview === mutation.review && version.summaryReviewNote === mutation.note) {
      return { status: "IDEMPOTENT", payload };
    }
    versions[index] = { ...version, summaryReview: mutation.review, summaryReviewNote: mutation.note };
    will.versions = versions;
  } else if (mutation.operation === "MARK_REVIEWED") {
    if (will.lastReviewedAt === mutation.reviewedAt && will.nextReviewAt === mutation.nextReviewAt) {
      return { status: "IDEMPOTENT", payload };
    }
    will.lastReviewedAt = mutation.reviewedAt;
    will.nextReviewAt = mutation.nextReviewAt;
  } else if (mutation.operation === "UPSERT_LETTER") {
    const result = upsertLetter(letters, mutation.letter, mutation.version);
    if (result !== "OK") return result === "IDEMPOTENT"
      ? { status: result, payload }
      : { status: result, payload: null };
    letters.updatedAt = now;
    wishes.myWill = will;
    wishes.lettersOfWishes = letters;
    payload.willsWishes = wishes;
    return { status: "OK", payload };
  } else {
    const result = restoreLetterVersion(letters, mutation);
    if (result !== "OK") return result === "IDEMPOTENT"
      ? { status: result, payload }
      : { status: result, payload: null };
    letters.updatedAt = mutation.createdAt;
    wishes.myWill = will;
    wishes.lettersOfWishes = letters;
    payload.willsWishes = wishes;
    return { status: "OK", payload };
  }
  will.updatedAt = now;
  wishes.myWill = will;
  wishes.lettersOfWishes = letters;
  payload.willsWishes = wishes;
  return { status: "OK", payload };
}
