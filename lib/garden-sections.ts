import type { IconName } from "@/components/UiIcon";

export type GardenSectionId =
  | "pets"
  | "outdoor-spaces"
  | "jobs"
  | "tools-shed"
  | "bins";

export type GardenSection = {
  id: GardenSectionId;
  title: string;
  description: string;
  icon: IconName;
  scope: string[];
};

export const gardenSections: GardenSection[] = [
  {
    id: "pets",
    title: "Pets",
    description: "Keep pet profiles, health records, routines and care information together.",
    icon: "heart",
    scope: ["Profiles", "Appointments", "Care routines", "Documents"],
  },
  {
    id: "outdoor-spaces",
    title: "Outdoor Spaces",
    description: "Organise outdoor areas, boundaries, gates and safety notes.",
    icon: "sun",
    scope: ["Areas", "Photos", "Boundaries", "Safety notes"],
  },
  {
    id: "jobs",
    title: "Garden Jobs",
    description: "Track maintenance, seasonal work and outdoor projects.",
    icon: "calendar",
    scope: ["Tasks", "Projects", "Seasonal work", "History"],
  },
  {
    id: "tools-shed",
    title: "Tools & Shed",
    description: "Keep shed, greenhouse, tool, machinery and equipment records together.",
    icon: "home",
    scope: ["Sheds", "Tools", "Equipment", "Manuals"],
  },
  {
    id: "bins",
    title: "Bins & Collections",
    description: "Keep waste, recycling and collection dates easy to remember.",
    icon: "archive",
    scope: ["Schedules", "Waste types", "Changes", "Reminders"],
  },
];

export function isGardenSection(value: string): value is GardenSectionId {
  return gardenSections.some((section) => section.id === value);
}

export function getGardenSection(value: GardenSectionId) {
  return gardenSections.find((section) => section.id === value)!;
}
