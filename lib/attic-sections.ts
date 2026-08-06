import type { IconName } from "@/components/UiIcon";

export type AtticSectionId =
  | "photo-albums"
  | "keepsakes"
  | "family-history"
  | "letters-journals"
  | "heirlooms"
  | "memory-box";

export type AtticSection = {
  id: AtticSectionId;
  title: string;
  description: string;
  icon: IconName;
  scope: string[];
};

export const atticSections: AtticSection[] = [
  {
    id: "photo-albums",
    title: "Photo Albums",
    description: "Keep old albums, scanned photos and family captions together.",
    icon: "camera",
    scope: ["Scanned albums", "Captions", "Dates", "People in photos"],
  },
  {
    id: "keepsakes",
    title: "Keepsakes",
    description: "Record the story behind sentimental items without mixing them into legal storage.",
    icon: "star",
    scope: ["Item notes", "Photos", "Who it belonged to", "Where it is stored"],
  },
  {
    id: "family-history",
    title: "Family History",
    description: "Build a gentle home for family stories, timelines and remembered details.",
    icon: "users",
    scope: ["Family stories", "Timeline notes", "Names", "Places"],
  },
  {
    id: "letters-journals",
    title: "Letters & Journals",
    description: "Save old letters, diaries and handwritten memories for future generations.",
    icon: "mail",
    scope: ["Letters", "Journals", "Transcriptions", "Related memories"],
  },
  {
    id: "heirlooms",
    title: "Heirlooms",
    description: "Track meaningful family items, their history and where they are kept.",
    icon: "archive",
    scope: ["Valuable keepsakes", "Provenance", "Photos", "Storage location"],
  },
  {
    id: "memory-box",
    title: "Memory Box",
    description: "Collect small memories, voice notes and personal stories in one calm place.",
    icon: "heart",
    scope: ["Voice notes", "Small memories", "Photos", "Story prompts"],
  },
];

export function isAtticSection(value: string): value is AtticSectionId {
  return atticSections.some((section) => section.id === value);
}

export function getAtticSection(value: AtticSectionId) {
  return atticSections.find((section) => section.id === value)!;
}
