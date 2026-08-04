import type { WillDocumentAnalysis } from "@/lib/will-document-analysis";

export type WillVersionStatus = "draft" | "signed" | "superseded";
export type WillAnalysisStatus = "processing" | "ready" | "failed" | "not-requested";
export type WillSummaryReview = "unreviewed" | "confirmed" | "incorrect";
export type WillPreparationStatus = "not-started" | "in-progress" | "complete";

export type WillExecutor = {
  name: string;
  email: string;
  phone: string;
  informed: boolean;
};

export type WillVersion = {
  id: string;
  documentId: string;
  versionLabel: string;
  uploadedAt: string;
  signedDate: string;
  status: WillVersionStatus;
  isCurrent: boolean;
  currentConfirmed: boolean;
  notes: string;
  analysisStatus: WillAnalysisStatus;
  summaryReview: WillSummaryReview;
  summaryReviewNote: string;
  detectedSummary?: WillDocumentAnalysis;
};

export const willPreparationSections = [
  { key: "personal-details", label: "Personal details" },
  { key: "family-dependants", label: "Family and dependants" },
  { key: "executors", label: "Executors" },
  { key: "guardians", label: "Guardians" },
  { key: "beneficiaries", label: "Beneficiaries" },
  { key: "assets-property", label: "Assets and property" },
  { key: "debts-obligations", label: "Debts and obligations" },
  { key: "specific-gifts", label: "Specific gifts" },
  { key: "residue-estate", label: "Residue of estate" },
  { key: "charitable-gifts", label: "Charitable gifts" },
  { key: "solicitor-questions", label: "Questions for a solicitor" }
] as const;

export type WillPreparationKey = (typeof willPreparationSections)[number]["key"];

export type WillPreparationItem = {
  status: WillPreparationStatus;
  confirmedData: string;
  updatedAt: string;
};

export type WillRecord = {
  versions: WillVersion[];
  currentVersionId: string;
  lastReviewedAt: string;
  nextReviewAt: string;
  solicitorName: string;
  solicitorFirm: string;
  solicitorPhone: string;
  solicitorEmail: string;
  referenceNumber: string;
  originalLocationType: "" | "home" | "solicitor" | "secure-storage" | "trusted-organisation" | "other";
  originalLocationDetails: string;
  originalOrganisation: string;
  originalContactName: string;
  originalPhone: string;
  originalEmail: string;
  originalReferenceNumber: string;
  originalAccessNotes: string;
  originalTrustedPeople: string;
  primaryExecutor: WillExecutor;
  backupExecutor: WillExecutor;
  trustedPersonInformed: boolean;
  notes: string;
  preparation: Record<WillPreparationKey, WillPreparationItem>;
  updatedAt: string;
};

function emptyExecutor(): WillExecutor {
  return { name: "", email: "", phone: "", informed: false };
}

function emptyPreparation(): Record<WillPreparationKey, WillPreparationItem> {
  return Object.fromEntries(
    willPreparationSections.map(({ key }) => [
      key,
      { status: "not-started", confirmedData: "", updatedAt: "" }
    ])
  ) as Record<WillPreparationKey, WillPreparationItem>;
}

export function createInitialWillRecord(): WillRecord {
  return {
    versions: [],
    currentVersionId: "",
    lastReviewedAt: "",
    nextReviewAt: "",
    solicitorName: "",
    solicitorFirm: "",
    solicitorPhone: "",
    solicitorEmail: "",
    referenceNumber: "",
    originalLocationType: "",
    originalLocationDetails: "",
    originalOrganisation: "",
    originalContactName: "",
    originalPhone: "",
    originalEmail: "",
    originalReferenceNumber: "",
    originalAccessNotes: "",
    originalTrustedPeople: "",
    primaryExecutor: emptyExecutor(),
    backupExecutor: emptyExecutor(),
    trustedPersonInformed: false,
    notes: "",
    preparation: emptyPreparation(),
    updatedAt: ""
  };
}

export function hydrateWillRecord(record: Partial<WillRecord> | null | undefined): WillRecord {
  const initial = createInitialWillRecord();
  const versions = Array.isArray(record?.versions) ? record.versions : [];
  const requestedCurrentId = record?.currentVersionId ?? "";
  const validCurrentId = versions.some((version) => version.id === requestedCurrentId)
    ? requestedCurrentId
    : versions.find((version) => version.isCurrent)?.id ?? "";

  return {
    ...initial,
    ...record,
    versions: versions.map((version) => ({
      ...version,
      summaryReview: version.summaryReview ?? "unreviewed",
      summaryReviewNote: version.summaryReviewNote ?? "",
      currentConfirmed: version.currentConfirmed ?? true,
      isCurrent: version.id === validCurrentId
    })),
    currentVersionId: validCurrentId,
    primaryExecutor: { ...initial.primaryExecutor, ...(record?.primaryExecutor ?? {}) },
    backupExecutor: { ...initial.backupExecutor, ...(record?.backupExecutor ?? {}) },
    preparation: Object.fromEntries(
      willPreparationSections.map(({ key }) => [
        key,
        { ...initial.preparation[key], ...(record?.preparation?.[key] ?? {}) }
      ])
    ) as Record<WillPreparationKey, WillPreparationItem>
  };
}

export function setCurrentWillVersion(record: WillRecord, versionId: string): WillRecord {
  const selected = record.versions.find((version) => version.id === versionId);
  if (!selected) return record;

  return {
    ...record,
    currentVersionId: versionId,
    versions: record.versions.map((version) => ({
      ...version,
      isCurrent: version.id === versionId,
      currentConfirmed: version.id === versionId ? true : version.currentConfirmed,
      status:
        version.id === versionId
          ? version.status === "superseded"
            ? "signed"
            : version.status
          : version.isCurrent && version.status !== "draft"
            ? "superseded"
            : version.status
    })),
    updatedAt: new Date().toISOString()
  };
}

export function getCurrentWillVersion(record: WillRecord) {
  return record.versions.find((version) => version.id === record.currentVersionId) ?? null;
}

export function getWillDashboardStatus(record: WillRecord) {
  const current = getCurrentWillVersion(record);
  if (!current) return { label: "No will added", tone: "empty" as const };
  if (!current.currentConfirmed) {
    return { label: "Current version needs confirmation", tone: "attention" as const };
  }
  if (record.nextReviewAt && new Date(record.nextReviewAt) < new Date(new Date().toDateString())) {
    return { label: "Review recommended", tone: "attention" as const };
  }
  if (current.status === "draft") return { label: "Draft uploaded", tone: "progress" as const };
  return { label: "Signed copy stored", tone: "complete" as const };
}

export function getPreparationProgress(record: WillRecord) {
  const items = willPreparationSections.map(({ key }) => record.preparation[key]);
  return {
    complete: items.filter((item) => item.status === "complete").length,
    started: items.filter((item) => item.status !== "not-started").length,
    total: items.length
  };
}
