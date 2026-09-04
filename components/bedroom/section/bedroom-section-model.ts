import type { IconName } from "@/components/UiIcon";
import type { BedroomSectionId } from "@/lib/health-records";
import type { VaultDocument } from "@/lib/mock-data";

export type BedroomDraft = typeof emptyBedroomDraft;

export const bedroomSectionMeta: Record<
  BedroomSectionId,
  { title: string; description: string; icon: IconName }
> = {
  "health-profile": {
    title: "Health Profile",
    description:
      "A clear summary of the health information you choose to record.",
    icon: "heart",
  },
  "medical-records": {
    title: "Medical Records",
    description:
      "Private letters, reports and medical documents stored through All Files.",
    icon: "folder",
  },
  medications: {
    title: "Medications & Prescriptions",
    description: "User-confirmed medicines, directions and review dates.",
    icon: "file",
  },
  appointments: {
    title: "Appointments",
    description: "Healthcare appointments, preparation and follow-up.",
    icon: "calendar",
  },
  tests: {
    title: "Tests & Results",
    description:
      "Test records and follow-up information you have entered or reviewed.",
    icon: "chart",
  },
  "health-timeline": {
    title: "Health Timeline",
    description: "A chronological view of the events you have recorded.",
    icon: "clock",
  },
  "dental-optical": {
    title: "Dental & Optical",
    description: "Dental visits, eye tests and future review dates.",
    icon: "sun",
  },
  emergency: {
    title: "Emergency Medical Info",
    description:
      "Important details prepared for an emergency. This is not an emergency service.",
    icon: "shield",
  },
  vaccinations: {
    title: "Vaccinations",
    description: "Vaccination dates and the records you choose to add.",
    icon: "check",
  },
  "family-health": {
    title: "Family Health",
    description:
      "Link existing family profiles without granting them access to your records.",
    icon: "users",
  },
  contacts: {
    title: "Healthcare Contacts",
    description: "Reuse people from your Professional Contacts directory.",
    icon: "phone",
  },
  "care-preferences": {
    title: "Care Preferences",
    description:
      "Private preferences in your own words. They are not advance medical instructions.",
    icon: "heart",
  },
  wellbeing: {
    title: "Sleep & Wellbeing",
    description: "Optional private notes about sleep and general wellbeing.",
    icon: "bed",
  },
  "medical-devices": {
    title: "Medical Devices",
    description:
      "Record device names, key dates and notes without creating clinical conclusions.",
    icon: "gear",
  },
  allergies: {
    title: "Allergies",
    description:
      "Allergies and reactions exactly as you choose to record them.",
    icon: "alert",
  },
  conditions: {
    title: "Conditions",
    description: "A personal list of current or past conditions.",
    icon: "file",
  },
  procedures: {
    title: "Operations & Procedures",
    description: "Key dates and notes for procedures you have recorded.",
    icon: "calendar",
  },
};

export const emptyBedroomDraft = {
  title: "",
  date: "",
  secondary: "",
  detail: "",
  notes: "",
  time: "",
  makeReminder: false,
};

export const addableBedroomSections: BedroomSectionId[] = [
  "medications",
  "appointments",
  "tests",
  "health-timeline",
  "dental-optical",
  "vaccinations",
  "wellbeing",
  "medical-devices",
  "allergies",
  "conditions",
  "procedures",
];

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
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

export function healthContactName(contact: {
  firstName: string;
  lastName: string;
  company: string;
}) {
  return (
    `${contact.firstName} ${contact.lastName}`.trim() ||
    contact.company ||
    "Unnamed contact"
  );
}
