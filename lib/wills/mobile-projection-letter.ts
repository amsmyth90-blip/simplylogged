import type {
  MobileLetterContentVersion,
  MobileLetterOfWishes,
  MobileLettersOfWishesRecord,
} from "@diarydock/wills";

import { bool, date, object, oneOf, text, timestamp, uniqueText } from "./projection-values.ts";

function unique<T extends { id: string }>(items: Array<T | null>) {
  const ids = new Set<string>();
  return items.filter((entry): entry is T => {
    if (!entry || ids.has(entry.id)) return false;
    ids.add(entry.id);
    return true;
  });
}

function version(value: unknown): MobileLetterContentVersion | null {
  const item = object(value);
  const id = text(item.id, 128);
  const title = text(item.title, 240);
  const versionNumber = Number(item.versionNumber);
  if (!id || !title || !Number.isSafeInteger(versionNumber) || versionNumber < 1 || versionNumber > 10_000) return null;
  return { id, title, versionNumber, createdAt: timestamp(item.createdAt) };
}

function letter(value: unknown): MobileLetterOfWishes | null {
  const item = object(value);
  const id = text(item.id, 128);
  const title = text(item.title, 240);
  const content = text(item.content, 50_000);
  if (!id || !title || !content) return null;
  const delivery = object(item.delivery);
  return {
    id,
    title,
    recipientType: oneOf(item.recipientType, ["children", "partner", "family", "friend", "future-me", "other"], "other"),
    recipientName: text(item.recipientName, 160),
    purpose: oneOf(item.purpose, ["just-because", "life-moment", "future-delivery", "important-guidance"], "just-because"),
    content,
    envelopeTitle: text(item.envelopeTitle, 240), envelopeMessage: text(item.envelopeMessage, 2_000),
    memoryNotes: text(item.memoryNotes, 10_000),
    attachmentDocumentIds: uniqueText(item.attachmentDocumentIds, 128, 100),
    delivery: {
      type: oneOf(delivery.type, ["not-set", "now", "date", "event", "after-death"], "not-set"),
      date: date(delivery.date), time: /^\d{2}:\d{2}$/.test(text(delivery.time, 5)) ? text(delivery.time, 5) : "",
      eventDescription: text(delivery.eventDescription, 2_000),
      reminder: oneOf(delivery.reminder, ["none", "1-day", "7-days", "30-days"], "none"),
      intendedPeople: text(delivery.intendedPeople, 2_000), trustedSettingsReviewed: bool(delivery.trustedSettingsReviewed),
    },
    deliveryActivation: "not-active",
    status: oneOf(item.status, ["draft", "ready"], "draft"),
    versions: unique((Array.isArray(item.versions) ? item.versions : [])
      .slice(0, 100).map(version)),
    createdAt: timestamp(item.createdAt), updatedAt: timestamp(item.updatedAt),
  };
}

export function projectMobileLetters(value: unknown): MobileLettersOfWishesRecord {
  const root = object(value);
  return {
    letters: unique((Array.isArray(root.letters) ? root.letters : [])
      .slice(0, 10_000).map(letter)),
    updatedAt: timestamp(root.updatedAt, true),
  };
}
