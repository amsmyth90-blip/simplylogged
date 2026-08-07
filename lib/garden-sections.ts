import type { IconName } from "@/components/UiIcon";

export type GardenSectionId =
  | "pets"
  | "outdoor-spaces"
  | "jobs"
  | "outbuildings"
  | "equipment"
  | "bins"
  | "projects"
  | "boundaries";

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
    description: "Organise gardens, patios, balconies, driveways and outdoor areas.",
    icon: "sun",
    scope: ["Areas", "Photos", "Condition notes", "Linked jobs"],
  },
  {
    id: "jobs",
    title: "Jobs & Maintenance",
    description: "Track recurring jobs, repairs and seasonal outdoor work.",
    icon: "calendar",
    scope: ["One-off jobs", "Recurring jobs", "Assignments", "History"],
  },
  {
    id: "outbuildings",
    title: "Sheds & Outbuildings",
    description: "Manage sheds, greenhouses, garden offices and outdoor buildings.",
    icon: "home",
    scope: ["Buildings", "Maintenance", "Repairs", "Documents"],
  },
  {
    id: "equipment",
    title: "Tools & Equipment",
    description: "Store records for outdoor tools, machinery and equipment.",
    icon: "gear",
    scope: ["Equipment", "Servicing", "Warranties", "Manuals"],
  },
  {
    id: "bins",
    title: "Bins & Collections",
    description: "Keep waste, recycling and collection dates easy to remember.",
    icon: "archive",
    scope: ["Schedules", "Waste types", "Changes", "Reminders"],
  },
  {
    id: "projects",
    title: "Garden Projects",
    description: "Plan and track outdoor improvements from idea to completion.",
    icon: "briefcase",
    scope: ["Plans", "Quotes", "Tasks", "Project files"],
  },
  {
    id: "boundaries",
    title: "Boundaries & Safety",
    description: "Keep fence, gate, boundary and outdoor safety records organised.",
    icon: "shield",
    scope: ["Fences & gates", "Condition notes", "Repairs", "Documents"],
  },
];

export function isGardenSection(value: string): value is GardenSectionId {
  return gardenSections.some((section) => section.id === value);
}

export function getGardenSection(value: GardenSectionId) {
  return gardenSections.find((section) => section.id === value)!;
}
