import type { FamilyStory, FamilyStoryImage } from "./types.ts";

type JsonRecord = Record<string, unknown>;

function object(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function string(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function image(value: unknown): FamilyStoryImage | null {
  const item = object(value);
  const documentId = string(item.documentId);
  const fileName = string(item.fileName);
  return documentId && fileName ? { documentId, fileName } : null;
}

export function hydrateFamilyStories(value: unknown): FamilyStory[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((value) => {
    const item = object(value);
    const id = string(item.id);
    if (!id) return [];
    return [{
      id,
      title: string(item.title, "Untitled family story"),
      storyText: string(item.storyText),
      people: string(item.people),
      place: string(item.place),
      dateLabel: string(item.dateLabel),
      tags: Array.isArray(item.tags)
        ? item.tags.filter((tag): tag is string => typeof tag === "string")
        : [],
      images: Array.isArray(item.images)
        ? item.images.map(image).filter((entry): entry is FamilyStoryImage => Boolean(entry))
        : [],
      createdAt: string(item.createdAt, new Date(0).toISOString()),
      updatedAt: string(item.updatedAt, new Date(0).toISOString()),
    }];
  });
}
