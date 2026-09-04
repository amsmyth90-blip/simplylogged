import type {
  LetterContentVersion,
  LetterDeliveryPreferences,
  LetterOfWishes,
  LettersOfWishesRecord,
  MobileLetterContentVersion,
  MobileLetterOfWishes,
  MobileLettersOfWishesRecord,
} from "./letter-types.ts";
import type { LetterDraft } from "./mutation-types.ts";
import {
  boolean,
  date,
  exact,
  list,
  oneOf,
  positiveInteger,
  record,
  text,
  timestamp,
} from "./validation.ts";

export function parseLetterContentVersion(value: unknown): LetterContentVersion {
  const item = record(value, "Letter version");
  exact(item, ["id", "versionNumber", "createdAt", "title", "content", "envelopeTitle", "envelopeMessage"], "Letter version");
  return {
    id: text(item.id, "Letter version ID", 128),
    versionNumber: positiveInteger(item.versionNumber, "Letter version number", 10_000),
    createdAt: timestamp(item.createdAt, "Letter version creation time"),
    title: text(item.title, "Letter version title", 240),
    content: text(item.content, "Letter version content", 50_000),
    envelopeTitle: text(item.envelopeTitle, "Letter envelope title", 240, true),
    envelopeMessage: text(item.envelopeMessage, "Letter envelope message", 2_000, true),
  };
}

function parseMobileContentVersion(value: unknown): MobileLetterContentVersion {
  const item = record(value, "Letter version summary");
  exact(item, ["id", "versionNumber", "createdAt", "title"], "Letter version summary");
  return {
    id: text(item.id, "Letter version ID", 128),
    versionNumber: positiveInteger(item.versionNumber, "Letter version number", 10_000),
    createdAt: timestamp(item.createdAt, "Letter version creation time"),
    title: text(item.title, "Letter version title", 240),
  };
}

export function parseLetterDelivery(value: unknown): LetterDeliveryPreferences {
  const item = record(value, "Letter delivery preferences");
  exact(item, ["type", "date", "time", "eventDescription", "reminder", "intendedPeople", "trustedSettingsReviewed"], "Letter delivery preferences");
  const time = text(item.time, "Letter delivery time", 5, true);
  if (time && !/^\d{2}:\d{2}$/.test(time)) throw new Error("Letter delivery time is invalid.");
  return {
    type: oneOf(item.type, ["not-set", "now", "date", "event", "after-death"], "Letter delivery type"),
    date: date(item.date, "Letter delivery date"),
    time,
    eventDescription: text(item.eventDescription, "Letter delivery event", 2_000, true),
    reminder: oneOf(item.reminder, ["none", "1-day", "7-days", "30-days"], "Letter delivery reminder"),
    intendedPeople: text(item.intendedPeople, "Letter intended people", 2_000, true),
    trustedSettingsReviewed: boolean(item.trustedSettingsReviewed, "Trusted-settings review flag"),
  };
}

export function parseLetter(value: unknown): LetterOfWishes {
  const item = record(value, "Letter of Wishes");
  const keys = ["id", "title", "recipientType", "recipientName", "purpose", "content",
    "envelopeTitle", "envelopeMessage", "memoryNotes", "attachmentDocumentIds",
    "delivery", "deliveryActivation", "status", "versions", "createdAt", "updatedAt"];
  exact(item, keys, "Letter of Wishes");
  return {
    id: text(item.id, "Letter ID", 128),
    title: text(item.title, "Letter title", 240),
    recipientType: oneOf(item.recipientType, ["children", "partner", "family", "friend", "future-me", "other"], "Letter recipient type"),
    recipientName: text(item.recipientName, "Letter recipient", 160, true),
    purpose: oneOf(item.purpose, ["just-because", "life-moment", "future-delivery", "important-guidance"], "Letter purpose"),
    content: text(item.content, "Letter content", 50_000),
    envelopeTitle: text(item.envelopeTitle, "Letter envelope title", 240, true),
    envelopeMessage: text(item.envelopeMessage, "Letter envelope message", 2_000, true),
    memoryNotes: text(item.memoryNotes, "Letter memory notes", 10_000, true),
    attachmentDocumentIds: list(item.attachmentDocumentIds, "Letter attachments", 100).map((id) => text(id, "Letter attachment ID", 128)),
    delivery: parseLetterDelivery(item.delivery),
    deliveryActivation: oneOf(item.deliveryActivation, ["not-active"], "Letter delivery activation"),
    status: oneOf(item.status, ["draft", "ready"], "Letter status"),
    versions: list(item.versions, "Letter versions", 100).map(parseLetterContentVersion),
    createdAt: timestamp(item.createdAt, "Letter creation time"),
    updatedAt: timestamp(item.updatedAt, "Letter update time"),
  };
}

export function parseLetterDraft(value: unknown): LetterDraft {
  const item = record(value, "Letter draft");
  const createdAt = new Date(0).toISOString();
  const parsed = parseLetter({ ...item, versions: [], createdAt, updatedAt: createdAt });
  return {
    id: parsed.id,
    title: parsed.title,
    recipientType: parsed.recipientType,
    recipientName: parsed.recipientName,
    purpose: parsed.purpose,
    content: parsed.content,
    envelopeTitle: parsed.envelopeTitle,
    envelopeMessage: parsed.envelopeMessage,
    memoryNotes: parsed.memoryNotes,
    attachmentDocumentIds: parsed.attachmentDocumentIds,
    delivery: parsed.delivery,
    deliveryActivation: parsed.deliveryActivation,
    status: parsed.status,
  };
}

export function parseLettersRecord(value: unknown): LettersOfWishesRecord {
  const item = record(value, "Letters record");
  exact(item, ["letters", "updatedAt"], "Letters record");
  return {
    letters: list(item.letters, "Letters", 100).map(parseLetter),
    updatedAt: timestamp(item.updatedAt, "Letters update time", true),
  };
}


export function parseMobileLetter(value: unknown): MobileLetterOfWishes {
  const item = record(value, "Mobile Letter of Wishes");
  const fullShape = { ...item, versions: [] };
  const base = parseLetter(fullShape);
  return {
    ...base,
    versions: list(item.versions, "Letter version summaries", 100)
      .map(parseMobileContentVersion),
  };
}

export function parseMobileLettersRecord(value: unknown): MobileLettersOfWishesRecord {
  const item = record(value, "Mobile letters record");
  exact(item, ["letters", "updatedAt"], "Mobile letters record");
  return {
    letters: list(item.letters, "Mobile letters", 100).map(parseMobileLetter),
    updatedAt: timestamp(item.updatedAt, "Letters update time", true),
  };
}
