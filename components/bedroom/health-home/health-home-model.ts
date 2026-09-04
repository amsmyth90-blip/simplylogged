import type { IconName } from "@/components/UiIcon";
import type { VaultDocument } from "@/lib/mock-data";

export type BedroomSection = {
  title: string;
  description: string;
  href: string;
  icon: IconName;
  tone?: "sage" | "lavender" | "blush";
};

export type HealthLink = {
  title: string;
  detail: string;
  href: string;
  icon: IconName;
};

export type HealthReview = HealthLink & { id: string; text: string };

export const primarySections: BedroomSection[] = [
  {
    title: "Health Profile",
    description: "Your important health information in one clear summary.",
    href: "/bedroom/health-profile",
    icon: "heart",
  },
  {
    title: "Medical Records",
    description:
      "Store letters, reports, discharge notes and medical documents.",
    href: "/bedroom/medical-records",
    icon: "folder",
    tone: "lavender",
  },
  {
    title: "Medications & Prescriptions",
    description:
      "Keep current medicines, prescriptions and renewal dates organised.",
    href: "/bedroom/medications",
    icon: "file",
    tone: "blush",
  },
  {
    title: "Appointments",
    description: "Manage healthcare appointments, preparation and follow-up.",
    href: "/bedroom/appointments",
    icon: "calendar",
  },
  {
    title: "Tests & Results",
    description: "Store test records and follow-up information over time.",
    href: "/bedroom/tests",
    icon: "chart",
    tone: "lavender",
  },
  {
    title: "Health Timeline",
    description: "See your appointments, treatments and key events in order.",
    href: "/bedroom/health-timeline",
    icon: "clock",
  },
  {
    title: "Dental & Optical",
    description:
      "Keep dental visits, eye tests, prescriptions and records together.",
    href: "/bedroom/dental-optical",
    icon: "sun",
    tone: "blush",
  },
  {
    title: "Emergency Medical Info",
    description: "Prepare the information someone may need in an emergency.",
    href: "/bedroom/emergency",
    icon: "shield",
    tone: "lavender",
  },
];

export const secondarySections: BedroomSection[] = [
  {
    title: "Vaccinations",
    description: "Dates and records",
    href: "/bedroom/vaccinations",
    icon: "check",
  },
  {
    title: "Family Health",
    description: "Linked family profiles",
    href: "/bedroom/family-health",
    icon: "users",
  },
  {
    title: "Healthcare Contacts",
    description: "GP, pharmacy and clinics",
    href: "/bedroom/contacts",
    icon: "phone",
  },
  {
    title: "Care Preferences",
    description: "Your recorded preferences",
    href: "/bedroom/care-preferences",
    icon: "heart",
  },
  {
    title: "Sleep & Wellbeing",
    description: "Private personal notes",
    href: "/bedroom/wellbeing",
    icon: "bed",
  },
  {
    title: "Health Insurance",
    description: "Link the Insurance Hub",
    href: "/office/insurance",
    icon: "shield",
  },
  {
    title: "Medical Devices",
    description: "Organise device records",
    href: "/bedroom/medical-devices",
    icon: "gear",
  },
  {
    title: "Allergies",
    description: "User-recorded details",
    href: "/bedroom/allergies",
    icon: "alert",
  },
  {
    title: "Conditions",
    description: "Personal health history",
    href: "/bedroom/conditions",
    icon: "file",
  },
  {
    title: "Operations & Procedures",
    description: "Key dates and notes",
    href: "/bedroom/procedures",
    icon: "calendar",
  },
];

export const addHealthLinks = [
  ["Upload medical document", "/capture?room=bedroom", "camera"],
  ["Add medication", "/bedroom/medications?add=1", "file"],
  ["Add appointment", "/bedroom/appointments?add=1", "calendar"],
  ["Add test result", "/bedroom/tests?add=1", "chart"],
  ["Add condition", "/bedroom/conditions?add=1", "heart"],
  ["Add allergy", "/bedroom/allergies?add=1", "alert"],
  ["Add vaccination", "/bedroom/vaccinations?add=1", "check"],
  ["Add timeline entry", "/bedroom/health-timeline?add=1", "clock"],
  ["Add healthcare contact", "/office/contacts/new", "phone"],
  ["Add emergency information", "/bedroom/emergency", "shield"],
] as const satisfies ReadonlyArray<readonly [string, string, IconName]>;

const starterHealthDocumentIds = new Set([
  "v5",
  "v9",
  "v10",
  "bed-d1",
  "bed-d2",
  "bed-d3",
]);

export function genuineHealthDocuments(documents: VaultDocument[]) {
  return documents.filter(
    (document) =>
      !starterHealthDocumentIds.has(document.id) &&
      (document.roomId === "bedroom" ||
        document.category === "Health & Medical"),
  );
}

export function formatHealthDate(value: string) {
  if (!value) return "Date not recorded";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function daysFromNow(value: string) {
  const time = new Date(`${value}T12:00:00`).getTime();
  if (!value || Number.isNaN(time)) return Number.POSITIVE_INFINITY;
  return Math.ceil((time - Date.now()) / 86_400_000);
}
