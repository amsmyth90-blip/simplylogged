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
  intention: string;
  primaryAction: string;
  secondaryAction: string;
  organiseBy: string[];
  prompts: string[];
  notHere: string[];
};

export const atticSections: AtticSection[] = [
  {
    id: "photo-albums",
    title: "Photo Albums",
    description: "Keep old albums, scanned photos and family captions together.",
    icon: "camera",
    scope: ["Scanned albums", "Captions", "Dates", "People in photos"],
    intention: "Turn boxes of old photos into a labelled, searchable family archive.",
    primaryAction: "Upload photos",
    secondaryAction: "Add album notes",
    organiseBy: ["Album or event", "Year or decade", "People pictured", "Original storage place"],
    prompts: [
      "Who is in these photos?",
      "Where and when were they taken?",
      "Is there a story you want the family to remember?",
    ],
    notHere: ["Passports or ID documents", "Insurance paperwork", "Travel bookings"],
  },
  {
    id: "keepsakes",
    title: "Keepsakes",
    description: "Record the story behind sentimental items without mixing them into legal storage.",
    icon: "star",
    scope: ["Item notes", "Photos", "Who it belonged to", "Where it is stored"],
    intention: "Keep the meaning of sentimental things safe, even if the item itself stays in a box.",
    primaryAction: "Add keepsake",
    secondaryAction: "Photograph item",
    organiseBy: ["Person connected", "Item type", "Storage location", "Story or memory"],
    prompts: [
      "Who did this belong to?",
      "Why does it matter?",
      "Where is the original kept?",
    ],
    notHere: ["High-value insurance schedules", "Legal ownership instructions", "Vehicle receipts"],
  },
  {
    id: "family-history",
    title: "Family History",
    description: "Build a gentle home for family stories, timelines and remembered details.",
    icon: "users",
    scope: ["Family stories", "Timeline notes", "Names", "Places"],
    intention: "Create a family story hub without turning it into a legal or genealogy system.",
    primaryAction: "Add family story",
    secondaryAction: "Record names",
    organiseBy: ["Family branch", "Person", "Place", "Life event"],
    prompts: [
      "Which person or side of the family is this about?",
      "What dates or places are known?",
      "What details should not be forgotten?",
    ],
    notHere: ["Trusted-person permissions", "Wills and letters of wishes", "Medical family history"],
  },
  {
    id: "letters-journals",
    title: "Letters & Journals",
    description: "Save old letters, diaries and handwritten memories for future generations.",
    icon: "mail",
    scope: ["Letters", "Journals", "Transcriptions", "Related memories"],
    intention: "Preserve meaningful writing and make it easier to read, search and understand.",
    primaryAction: "Scan letter",
    secondaryAction: "Add transcription",
    organiseBy: ["Sender or author", "Date", "Recipient", "Topic or memory"],
    prompts: [
      "Who wrote this?",
      "Who was it written for?",
      "Does it need a typed transcription?",
    ],
    notHere: ["Letters of wishes", "Bills and correspondence", "Medical letters"],
  },
  {
    id: "heirlooms",
    title: "Heirlooms",
    description: "Track meaningful family items, their history and where they are kept.",
    icon: "archive",
    scope: ["Valuable keepsakes", "Provenance", "Photos", "Storage location"],
    intention: "Record family heirlooms and their background without making legal promises.",
    primaryAction: "Add heirloom",
    secondaryAction: "Add provenance",
    organiseBy: ["Item", "Family line", "Storage location", "Known history"],
    prompts: [
      "What is the item?",
      "How did it come into the family?",
      "Is there supporting information or a photo?",
    ],
    notHere: ["Formal valuations for insurance", "Will instructions", "Home inventory for claims"],
  },
  {
    id: "memory-box",
    title: "Memory Box",
    description: "Collect small memories, voice notes and personal stories in one calm place.",
    icon: "heart",
    scope: ["Voice notes", "Small memories", "Photos", "Story prompts"],
    intention: "Give quick memories somewhere soft to land before they become a bigger archive.",
    primaryAction: "Add memory",
    secondaryAction: "Record voice note",
    organiseBy: ["Person", "Moment", "Theme", "Photo or item linked"],
    prompts: [
      "What happened?",
      "Who should know this story?",
      "Should this link to a photo, letter or keepsake?",
    ],
    notHere: ["Emergency instructions", "Funeral wishes", "Health preferences"],
  },
];

export function isAtticSection(value: string): value is AtticSectionId {
  return atticSections.some((section) => section.id === value);
}

export function getAtticSection(value: AtticSectionId) {
  return atticSections.find((section) => section.id === value)!;
}
