import type { WillAnalysisSummary, WillDocumentAnalysis } from "./analysis.ts";

export const WILLS_SCHEMA_VERSION = 2;
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

export type MobileWillVersion = Omit<WillVersion, "detectedSummary"> & {
  detectedSummary?: WillAnalysisSummary;
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
  { key: "solicitor-questions", label: "Questions for a solicitor" },
] as const;

export type WillPreparationKey = (typeof willPreparationSections)[number]["key"];
export type WillPreparationItem = {
  status: WillPreparationStatus;
  confirmedData: string;
  updatedAt: string;
};

export type WillRecordBase<Version> = {
  versions: Version[];
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

export type WillRecord = WillRecordBase<WillVersion>;
export type MobileWillRecord = WillRecordBase<MobileWillVersion>;
