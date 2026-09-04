import {
  ATTIC_SCHEMA_VERSION,
  parseAtticSnapshot,
  type AtticSnapshot,
  type FamilyStory,
  type FamilyStoryImage,
} from "@diarydock/attic";

import { jsonUtf8Bytes } from "../serialization/json-size.ts";

type JsonRecord = Record<string, unknown>;
const SNAPSHOT_LIMIT = 480 * 1024;

function object(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function string(value: unknown, maximum: number, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, maximum) || fallback;
}

function timestamp(value: unknown) {
  const candidate = string(value, 40);
  return Number.isFinite(Date.parse(candidate))
    ? candidate
    : new Date(0).toISOString();
}

function image(value: unknown): FamilyStoryImage | null {
  const item = object(value);
  const documentId = string(item.documentId, 128);
  const fileName = string(item.fileName, 240);
  return documentId && fileName ? { documentId, fileName } : null;
}

function story(value: unknown): FamilyStory | null {
  const item = object(value);
  const id = string(item.id, 128);
  if (!id) return null;
  return {
    id,
    title: string(item.title, 160, "Untitled family story"),
    storyText: string(item.storyText, 20_000, "No story text was recorded."),
    people: string(item.people, 500),
    place: string(item.place, 300),
    dateLabel: string(item.dateLabel, 120),
    tags: (Array.isArray(item.tags) ? item.tags : [])
      .slice(0, 8)
      .map((tag) => string(tag, 60))
      .filter(Boolean),
    images: (Array.isArray(item.images) ? item.images : [])
      .slice(0, 8)
      .map(image)
      .filter((entry): entry is FamilyStoryImage => Boolean(entry)),
    createdAt: timestamp(item.createdAt),
    updatedAt: timestamp(item.updatedAt),
  };
}

function fitStories(
  stories: FamilyStory[],
  revision: string | null,
  totalStoryCount: number,
  cursor: string | null,
) {
  const fitted: FamilyStory[] = [];
  let size = jsonUtf8Bytes({
    schemaVersion: ATTIC_SCHEMA_VERSION,
    revision,
    totalStoryCount,
    cursor,
    nextCursor: "x".repeat(128),
    stories: fitted,
  });
  for (const item of stories.slice(0, 1_000)) {
    const entrySize = jsonUtf8Bytes(item) + 1;
    if (size + entrySize > SNAPSHOT_LIMIT) continue;
    fitted.push(item);
    size += entrySize;
  }
  return fitted;
}

export function projectAtticSnapshot(
  payload: unknown,
  revision: string | null,
  cursor: string | null = null,
): AtticSnapshot {
  const root = object(payload);
  const ids = new Set<string>();
  const stories = (Array.isArray(root.familyStories) ? root.familyStories : [])
    .slice(0, 10_000)
    .map(story)
    .filter((entry): entry is FamilyStory => {
      if (!entry || ids.has(entry.id)) return false;
      ids.add(entry.id);
      return true;
    });
  const cursorIndex = cursor
    ? stories.findIndex((entry) => entry.id === cursor)
    : -1;
  const remaining = cursor
    ? cursorIndex >= 0
      ? stories.slice(cursorIndex + 1)
      : []
    : stories;
  const fitted = fitStories(remaining, revision, stories.length, cursor);
  const nextIndex = cursorIndex + 1 + fitted.length;
  const nextCursor =
    fitted.length && nextIndex < stories.length
      ? fitted[fitted.length - 1]!.id
      : null;
  return parseAtticSnapshot({
    schemaVersion: ATTIC_SCHEMA_VERSION,
    revision,
    totalStoryCount: stories.length,
    cursor,
    nextCursor,
    stories: fitted,
  });
}

export { mutateAtticPayload } from "./mobile-mutation.ts";
