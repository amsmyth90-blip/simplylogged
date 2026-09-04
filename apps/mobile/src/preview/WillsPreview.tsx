import { useMemo } from "react";

import {
  WILLS_SCHEMA_VERSION,
  createInitialWillRecord,
  createInitialWishesPreferences,
  type WillsSnapshot,
} from "@diarydock/wills";
import type { LocalRecord } from "@diarydock/offline-store";

import { PreviewStore } from "@mobile/preview/MobilePreview";
import { SafeRoomScreen } from "@mobile/wills/SafeRoomScreen";

const ownerId = "f330a7d2-8ef1-4f6e-a6ec-118ea3a14f51";
const now = "2026-09-02T12:00:00.000Z";

const will = createInitialWillRecord();
will.versions = [{
  id: "will-version-1", documentId: "will-document", versionLabel: "Signed will — August 2026",
  uploadedAt: now, signedDate: "2026-08-20", status: "signed", isCurrent: true,
  currentConfirmed: true, notes: "Signed copy checked and stored.", analysisStatus: "ready",
  summaryReview: "unreviewed", summaryReviewNote: "",
  detectedSummary: {
    overview: "A signed will naming executors and beneficiaries.",
    executors: ["Alex Morgan"], beneficiaries: ["Immediate family"], guardians: [],
    specificGifts: [], charitableGifts: [], residueOfEstate: ["Immediate family"],
    funeralWishesReferences: [], conditionsOrInstructions: [],
    questionsOrUnclearWording: ["Confirm substitute executor wording with solicitor"],
    extractedText: "",
    confidence: .84,
  },
}];
will.currentVersionId = "will-version-1";
will.lastReviewedAt = "2026-08-22";
will.nextReviewAt = "2027-08-22";
will.solicitorName = "Jamie Ellis";
will.solicitorFirm = "Ellis & Co";
will.primaryExecutor = { name: "Alex Morgan", email: "alex@example.com", phone: "07700 900123", informed: true };
will.originalLocationType = "solicitor";
will.originalLocationDetails = "Original held by Ellis & Co";
will.preparation.executors = { status: "complete", confirmedData: "Alex has agreed to act.", updatedAt: now };
will.preparation.beneficiaries = { status: "in-progress", confirmedData: "Review names with solicitor.", updatedAt: now };
will.updatedAt = now;

const snapshot: WillsSnapshot = {
  schemaVersion: WILLS_SCHEMA_VERSION,
  revision: now,
  counts: { versions: 1, letters: 1 },
  wishes: {
    ...createInitialWishesPreferences(),
    fullName: "Taylor Morgan",
    funeralPreference: "A small, personal gathering",
    personalMessage: "Keep family close and remember the ordinary days.",
    trustedPeople: "Alex and Jamie",
    reviewFrequency: "Every year",
    lastReviewed: "2026-08-22",
    updatedAt: now,
  },
  will: { ...will, versions: will.versions.map(({ detectedSummary, ...version }) => ({
    ...version,
    detectedSummary: detectedSummary ? {
      overview: detectedSummary.overview,
      executors: detectedSummary.executors,
      beneficiaries: detectedSummary.beneficiaries,
      guardians: detectedSummary.guardians,
      specificGifts: detectedSummary.specificGifts,
      charitableGifts: detectedSummary.charitableGifts,
      residueOfEstate: detectedSummary.residueOfEstate,
      funeralWishesReferences: detectedSummary.funeralWishesReferences,
      conditionsOrInstructions: detectedSummary.conditionsOrInstructions,
      questionsOrUnclearWording: detectedSummary.questionsOrUnclearWording,
      confidence: detectedSummary.confidence,
    } : undefined,
  })) },
  letters: { updatedAt: now, letters: [{
    id: "letter-1", title: "For my family", recipientType: "family", recipientName: "",
    purpose: "important-guidance", content: "A private message about the people and memories that matter most.",
    envelopeTitle: "For my family", envelopeMessage: "With love", memoryNotes: "",
    attachmentDocumentIds: [], delivery: { type: "not-set", date: "", time: "",
      eventDescription: "", reminder: "none", intendedPeople: "", trustedSettingsReviewed: false },
    deliveryActivation: "not-active", status: "draft",
    versions: [{ id: "letter-version-1", versionNumber: 1, createdAt: now, title: "For my family" }],
    createdAt: now, updatedAt: now,
  }] },
};

const records: LocalRecord[] = [{
  id: "will-file-record", entityType: "document", scope: { kind: "USER", id: ownerId },
  revision: "3", schemaVersion: 1, updatedAt: now, deletedAt: null,
  payload: { documentId: "will-document", title: "Signed will — August 2026",
    category: "Legal & Estate", kind: "PDF", size: "1.2 MB", roomId: "safe-room",
    roomName: "Safe Room", reviewStatus: "reviewed", emergencyVisible: false,
    hasStoredFile: true },
  syncState: "CLEAN",
}];

export function WillsPreview() {
  const store = useMemo(() => new PreviewStore(records), []);
  return <SafeRoomScreen accessToken="preview-access-token-that-is-long-enough" disableOnline initialSnapshot={snapshot} store={store} syncStatus="READY" synchronize={async () => true} onBack={() => undefined} onNavigate={() => undefined} onScan={() => undefined} />;
}
