import type { AtticSection, AtticSectionId } from "./types.ts";

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
    prompts: ["Who is in these photos?", "Where and when were they taken?", "Is there a story you want the family to remember?"],
    notHere: ["Passports or ID documents", "Insurance paperwork", "Travel bookings"],
  },
  {
    id: "keepsakes",
    title: "Keepsakes & Heirlooms",
    description: "Record meaningful family items, their stories and where the originals are kept.",
    icon: "archive",
    scope: ["Item notes", "Photos", "Who it belonged to", "Known history", "Storage location"],
    intention: "Keep the meaning and history of treasured items together in one simple place.",
    primaryAction: "Add item",
    secondaryAction: "Photograph item",
    organiseBy: ["Person or family line", "Item type", "Storage location", "Story or memory"],
    prompts: ["Who did this belong to?", "Why does it matter, and how did it come into the family?", "Where is the original kept?"],
    notHere: ["Formal valuations for insurance", "Will instructions", "Home inventory for claims"],
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
    prompts: ["Which person or side of the family is this about?", "What dates or places are known?", "What details should not be forgotten?"],
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
    prompts: ["Who wrote this?", "Who was it written for?", "Does it need a typed transcription?"],
    notHere: ["Letters of wishes", "Bills and correspondence", "Medical letters"],
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
    prompts: ["What happened?", "Who should know this story?", "Should this link to a photo, letter or keepsake?"],
    notHere: ["Emergency instructions", "Funeral wishes", "Health preferences"],
  },
];

export function isAtticSection(value: string): value is AtticSectionId {
  return atticSections.some((section) => section.id === value);
}

export function getAtticSection(value: AtticSectionId) {
  return atticSections.find((section) => section.id === value)!;
}
