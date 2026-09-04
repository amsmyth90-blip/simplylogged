import {
  gardenDocumentMatches,
  gardenReminderMatches,
  type GardenSectionId,
} from "@/lib/garden-sections";
import type { Reminder, VaultDocument } from "@/lib/mock-data";

export type GardenSectionMeta = {
  accent: "sage" | "moss" | "clay" | "gold";
  description: string;
  documentTerms: string[];
  emptyDetail: string;
  emptyTitle: string;
  eyebrow: string;
  guidance: string[];
  notice?: string;
  primaryAction: string;
  reminderTerms: string[];
  title: string;
};

export type GardenReminderDraft = {
  date: string;
  note: string;
  priority: Reminder["priority"];
  repeat: string;
  time: string;
  title: string;
};

export const emptyGardenReminderDraft: GardenReminderDraft = {
  title: "",
  date: "",
  time: "",
  note: "",
  repeat: "",
  priority: "normal",
};

export const gardenSectionMeta: Record<GardenSectionId, GardenSectionMeta> = {
  pets: {
    eyebrow: "Pets & care",
    title: "Pet profiles and care records",
    description:
      "Keep pet routines, vet details, vaccination records and care notes together without mixing them into Family or Health.",
    primaryAction: "Add pet reminder",
    emptyTitle: "No pet care items yet",
    emptyDetail:
      "Add vaccination dates, flea treatment reminders, pet-sitter notes or upload a pet document when you are ready.",
    documentTerms: ["pet", "vet", "veterinary", "vaccination", "microchip"],
    reminderTerms: ["pet", "vet", "vaccination", "flea", "worm"],
    guidance: [
      "Pet profiles",
      "Vet records",
      "Vaccination dates",
      "Care routines",
    ],
    notice:
      "DiaryDock helps organise pet information you provide. It does not diagnose, prescribe or replace advice from a qualified veterinary professional.",
    accent: "sage",
  },
  "outdoor-spaces": {
    eyebrow: "Outdoor spaces",
    title: "Outdoor spaces, boundaries and safety",
    description:
      "Organise gardens, patios, fences, gates and outdoor safety notes without pulling in vehicle or travel records.",
    primaryAction: "Add outdoor reminder",
    emptyTitle: "No outdoor space records yet",
    emptyDetail:
      "Use this for patio notes, boundary repairs, gate checks, outdoor lighting or garden condition photos.",
    documentTerms: [
      "garden",
      "patio",
      "balcony",
      "outdoor",
      "deck",
      "lawn",
      "planting",
      "boundary",
      "fence",
      "gate",
      "wall",
      "safety",
      "outdoor light",
      "neighbour",
    ],
    reminderTerms: [
      "garden",
      "patio",
      "balcony",
      "outdoor",
      "lawn",
      "planting",
      "boundary",
      "fence",
      "gate",
      "wall",
      "safety",
      "outdoor light",
    ],
    guidance: [
      "Outdoor areas",
      "Fences & gates",
      "Condition photos",
      "Safety notes",
    ],
    notice:
      "DiaryDock stores your notes and documents but does not determine legal boundary ownership, certify safety or replace advice from a qualified professional.",
    accent: "moss",
  },
  jobs: {
    eyebrow: "Jobs & maintenance",
    title: "Garden jobs and outdoor projects",
    description:
      "Track recurring jobs, one-off outdoor repairs, seasonal maintenance and projects using DiaryDock's existing reminder system.",
    primaryAction: "Add garden job",
    emptyTitle: "No garden jobs yet",
    emptyDetail:
      "Add a job such as hedge trimming, pressure washing, lawn care, landscaping quotes or seasonal checks.",
    documentTerms: [
      "garden",
      "outdoor",
      "maintenance",
      "repair",
      "hedge",
      "lawn",
      "sprinkler",
      "garden project",
      "landscaping",
      "quote",
      "outdoor project",
      "planting plan",
    ],
    reminderTerms: [
      "garden",
      "outdoor",
      "maintenance",
      "repair",
      "hedge",
      "lawn",
      "sprinkler",
      "garden project",
      "landscaping",
      "quote",
      "outdoor project",
      "planting plan",
    ],
    guidance: ["One-off jobs", "Recurring jobs", "Projects", "History"],
    accent: "gold",
  },
  "tools-shed": {
    eyebrow: "Tools & shed",
    title: "Tools, equipment and outdoor storage",
    description:
      "Store shed notes, greenhouse checks, tool manuals, servicing reminders and warranty files without duplicating appliance records from the Kitchen.",
    primaryAction: "Add tools or shed reminder",
    emptyTitle: "No tools or shed records yet",
    emptyDetail:
      "Add shed repairs, greenhouse checks, lawnmower servicing, pressure washer manuals or battery checks.",
    documentTerms: [
      "shed",
      "greenhouse",
      "outbuilding",
      "garden office",
      "summer house",
      "tool",
      "equipment",
      "lawnmower",
      "mower",
      "pressure washer",
      "strimmer",
      "warranty",
      "manual",
    ],
    reminderTerms: [
      "shed",
      "greenhouse",
      "outbuilding",
      "garden office",
      "summer house",
      "tool",
      "equipment",
      "lawnmower",
      "mower",
      "pressure washer",
      "strimmer",
      "battery",
    ],
    guidance: ["Sheds", "Tools", "Servicing", "Manuals"],
    accent: "sage",
  },
  bins: {
    eyebrow: "Bins & collections",
    title: "Waste and recycling collections",
    description:
      "Keep bin-day reminders and collection changes visible here, without turning the Kitchen noticeboard into a catch-all.",
    primaryAction: "Add collection reminder",
    emptyTitle: "No collection schedule yet",
    emptyDetail:
      "Add recycling, food waste, garden waste or bulky collection reminders.",
    documentTerms: [
      "bin",
      "bins",
      "recycling",
      "waste",
      "collection",
      "council",
    ],
    reminderTerms: [
      "bin",
      "bins",
      "recycling",
      "waste",
      "collection",
      "garden waste",
    ],
    guidance: ["Schedules", "Waste types", "Changes", "Reminders"],
    accent: "moss",
  },
};

export const gardenAccentClasses = {
  sage: {
    hero: "bg-[linear-gradient(135deg,#315443,#5f7f63)]",
    tint: "bg-[#eef4eb]",
    icon: "bg-[#e3ecdf] text-[#52705a]",
  },
  moss: {
    hero: "bg-[linear-gradient(135deg,#25392e,#6f8e72)]",
    tint: "bg-[#edf2e8]",
    icon: "bg-[#dde8d7] text-[#48654f]",
  },
  clay: {
    hero: "bg-[linear-gradient(135deg,#315443,#a98b67)]",
    tint: "bg-[#f4eee4]",
    icon: "bg-[#eadfcd] text-[#765f43]",
  },
  gold: {
    hero: "bg-[linear-gradient(135deg,#315443,#b89a57)]",
    tint: "bg-[#f7f1df]",
    icon: "bg-[#efe5c7] text-[#7a6336]",
  },
};

export function filterGardenDocuments(
  documents: VaultDocument[],
  sectionId: GardenSectionId,
) {
  return documents.filter((document) =>
    gardenDocumentMatches(document, sectionId),
  );
}

export function filterGardenReminders(
  reminders: Reminder[],
  sectionId: GardenSectionId,
) {
  return reminders.filter((reminder) =>
    gardenReminderMatches(reminder, sectionId),
  );
}

export function formatGardenDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}
