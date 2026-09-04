import {
  ATTIC_SCHEMA_VERSION,
  type AtticSnapshot,
  type FamilyStory,
  type FamilyStoryImage,
} from "./types.ts";
import { count, exact, list, record, revision, text, timestamp } from "./validation.ts";

function image(value: unknown): FamilyStoryImage {
  const item = record(value, "Story image");
  exact(item, ["documentId", "fileName"], "Story image");
  return {
    documentId: text(item.documentId, "Document ID", 128),
    fileName: text(item.fileName, "Image file name", 240),
  };
}

export function parseFamilyStory(value: unknown): FamilyStory {
  const item = record(value, "Family story");
  exact(
    item,
    [
      "id",
      "title",
      "storyText",
      "people",
      "place",
      "dateLabel",
      "tags",
      "images",
      "createdAt",
      "updatedAt",
    ],
    "Family story",
  );
  return {
    id: text(item.id, "Story ID", 128),
    title: text(item.title, "Story title", 160),
    storyText: text(item.storyText, "Story", 20_000),
    people: text(item.people, "People", 500, true),
    place: text(item.place, "Place", 300, true),
    dateLabel: text(item.dateLabel, "Story date", 120, true),
    tags: list(item.tags, "Story tags", 8).map((tag) =>
      text(tag, "Story tag", 60),
    ),
    images: list(item.images, "Story images", 8).map(image),
    createdAt: timestamp(item.createdAt, "Created time"),
    updatedAt: timestamp(item.updatedAt, "Updated time"),
  };
}

export function parseAtticSnapshot(value: unknown): AtticSnapshot {
  const item = record(value, "Attic snapshot");
  exact(
    item,
    [
      "schemaVersion",
      "revision",
      "totalStoryCount",
      "cursor",
      "nextCursor",
      "stories",
    ],
    "Attic snapshot",
  );
  if (item.schemaVersion !== ATTIC_SCHEMA_VERSION) {
    throw new Error("Please update DiaryDock to open the Attic.");
  }
  return {
    schemaVersion: ATTIC_SCHEMA_VERSION,
    revision: revision(item.revision),
    totalStoryCount: count(item.totalStoryCount, "Story count", 10_000),
    cursor: item.cursor === null ? null : text(item.cursor, "Story cursor", 128),
    nextCursor:
      item.nextCursor === null
        ? null
        : text(item.nextCursor, "Next story cursor", 128),
    stories: list(item.stories, "Family stories", 1_000).map(parseFamilyStory),
  };
}
