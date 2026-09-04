export const ATTIC_SCHEMA_VERSION = 2;

export type AtticSectionId =
  | "photo-albums"
  | "keepsakes"
  | "family-history"
  | "letters-journals"
  | "memory-box";

export type AtticIcon =
  | "archive"
  | "camera"
  | "heart"
  | "mail"
  | "users";

export type AtticSection = {
  id: AtticSectionId;
  title: string;
  description: string;
  icon: AtticIcon;
  scope: string[];
  intention: string;
  primaryAction: string;
  secondaryAction: string;
  organiseBy: string[];
  prompts: string[];
  notHere: string[];
};

export type FamilyStoryImage = {
  documentId: string;
  fileName: string;
};

export type FamilyStory = {
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

export type AtticSnapshot = {
  schemaVersion: typeof ATTIC_SCHEMA_VERSION;
  revision: string | null;
  totalStoryCount: number;
  cursor: string | null;
  nextCursor: string | null;
  stories: FamilyStory[];
};

export type AtticMutation = {
  operation: "ADD_STORY";
  revision: string | null;
  story: FamilyStory;
};
