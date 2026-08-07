export type FamilyStoryImage = {
  documentId: string;
  fileName: string;
};

export type FamilyStoryRecord = {
  id: string;
  title: string;
  storyText: string;
  people: string;
  place: string;
  dateLabel: string;
  tags: string[];
  images: FamilyStoryImage[];
  createdAt: string;
  updatedAt: string;
};

export function hydrateFamilyStories(value: unknown): FamilyStoryRecord[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Partial<FamilyStoryRecord> & { id: string } => {
      return Boolean(item && typeof item === "object" && "id" in item && typeof item.id === "string");
    })
    .map((item) => ({
      id: item.id,
      title: typeof item.title === "string" ? item.title : "Untitled family story",
      storyText: typeof item.storyText === "string" ? item.storyText : "",
      people: typeof item.people === "string" ? item.people : "",
      place: typeof item.place === "string" ? item.place : "",
      dateLabel: typeof item.dateLabel === "string" ? item.dateLabel : "",
      tags: Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === "string") : [],
      images: Array.isArray(item.images)
        ? item.images
            .filter((image): image is FamilyStoryImage => {
              return (
                Boolean(image) &&
                typeof image === "object" &&
                typeof image.documentId === "string" &&
                typeof image.fileName === "string"
              );
            })
            .map((image) => ({ documentId: image.documentId, fileName: image.fileName }))
        : [],
      createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : new Date().toISOString(),
    }));
}
