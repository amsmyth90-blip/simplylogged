import { useMemo } from "react";

import type { HealthSnapshot } from "@diarydock/health";
import type { LocalRecord } from "@diarydock/offline-store";

import { HealthScreen } from "@mobile/health/HealthScreen";
import type { HealthView } from "@mobile/health/HealthRecords";
import { PreviewStore } from "@mobile/preview/MobilePreview";

const ownerId = "f330a7d2-8ef1-4f6e-a6ec-118ea3a14f51";
const now = "2026-09-02T09:00:00.000Z";

const snapshot: HealthSnapshot = {
  schemaVersion: 2,
  revision: now,
  counts: {
    conditions: 1,
    allergies: 1,
    medications: 2,
    appointments: 2,
    tests: 0,
    vaccinations: 0,
    timeline: 3,
    dentalOptical: 0,
    wellbeing: 0,
  },
  directory: {
    familyProfiles: [
      { id: "family-1", name: "Alex Morgan", role: "Partner" },
      { id: "family-2", name: "Jamie Morgan", role: "Child" },
    ],
    contacts: [
      { id: "gp-1", name: "Dr Lewis", role: "GP", company: "Health Centre", phone: "020 7946 0123" },
      { id: "pharmacy-1", name: "Oak Pharmacy", role: "Pharmacist", company: "Oak Pharmacy", phone: "020 7946 0456" },
      { id: "contact-1", name: "Alex Morgan", role: "Emergency contact", company: "", phone: "07700 900123" },
    ],
  },
  health: {
    profile: {
      bloodGroup: "O+",
      gpContactId: "gp-1",
      pharmacyContactId: "pharmacy-1",
      emergencyContactId: "contact-1",
      emergencyNotes: "Inhaler is kept in the bedside drawer.",
      lastReviewedAt: now,
    },
    conditions: [{ id: "condition-1", name: "Asthma", recordedDate: "2019-04-10", status: "current", notes: "User-recorded health information.", createdAt: now }],
    allergies: [{ id: "allergy-1", allergen: "Penicillin", reaction: "Skin rash", severity: "moderate", notes: "User recorded.", createdAt: now }],
    medications: [
      { id: "med-1", name: "Example inhaler", dose: "Two puffs", frequency: "When required", prescriber: "GP", status: "current", reviewDate: "2026-11-20", notes: "User recorded.", createdAt: now },
      { id: "med-2", name: "Vitamin D", dose: "One tablet", frequency: "Daily", prescriber: "", status: "current", reviewDate: "", notes: "", createdAt: now },
    ],
    appointments: [
      { id: "appointment-1", title: "Annual health review", provider: "Dr Lewis", location: "Health Centre", date: "2026-09-18", time: "10:30", status: "planned", preparationNotes: "Bring medication list.", followUpNotes: "", createdAt: now },
      { id: "appointment-2", title: "Dental check-up", provider: "Oak Dental", location: "Town Centre", date: "2026-10-03", time: "09:00", status: "planned", preparationNotes: "", followUpNotes: "", createdAt: now },
    ],
    tests: [],
    vaccinations: [],
    timeline: [
      { id: "event-1", type: "appointment", title: "Annual health review", date: "2026-09-18", notes: "Bring medication list.", linkedRecordId: "appointment-1", createdAt: now },
      { id: "event-2", type: "medication", title: "Example inhaler", date: "2026-08-01", notes: "Medication recorded.", linkedRecordId: "med-1", createdAt: now },
      { id: "event-3", type: "condition", title: "Asthma", date: "2019-04-10", notes: "Condition recorded.", linkedRecordId: "condition-1", createdAt: now },
    ],
    dentalOptical: [],
    wellbeing: [],
    carePreferences: "Please explain options clearly and allow time to ask questions.",
    familyMemberIds: ["family-1"],
    updatedAt: now,
  },
};

const records: LocalRecord[] = [{
  id: "health-document-record",
  entityType: "document",
  scope: { kind: "USER", id: ownerId },
  revision: "3",
  schemaVersion: 1,
  updatedAt: now,
  deletedAt: null,
  payload: {
    documentId: "health-document",
    title: "Annual health review letter",
    category: "Health",
    kind: "PDF",
    size: "640 KB",
    roomId: "bedroom",
    roomName: "Bedroom",
    reviewStatus: "reviewed",
    emergencyVisible: false,
    hasStoredFile: true,
  },
  syncState: "CLEAN",
}];

export function HealthPreview() {
  const store = useMemo(() => new PreviewStore(records), []);
  const requested = new URLSearchParams(window.location.search).get("view");
  const views: HealthView[] = ["overview", "history", "allergies", "medications", "appointments", "documents", "emergency"];
  const initialView = views.includes(requested as HealthView) ? requested as HealthView : "overview";
  return <HealthScreen accessToken="preview-access-token-that-is-long-enough" disableOnline initialSnapshot={snapshot} initialView={initialView} store={store} syncStatus="READY" synchronize={async () => true} onBack={() => undefined} onNavigate={() => undefined} onScan={() => undefined} />;
}
