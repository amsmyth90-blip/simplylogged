import type { WillAnalysisSummary } from "./analysis.ts";
import type {
  MobileWillRecord,
  MobileWillVersion,
  WillExecutor,
  WillPreparationItem,
  WillPreparationKey,
} from "./will-types.ts";
import { willPreparationSections } from "./will-types.ts";
import {
  boolean,
  date,
  exact,
  list,
  oneOf,
  record,
  text,
  timestamp,
} from "./validation.ts";

const summaryListKeys = [
  "executors", "beneficiaries", "guardians", "specificGifts",
  "charitableGifts", "residueOfEstate", "funeralWishesReferences",
  "conditionsOrInstructions", "questionsOrUnclearWording",
] as const;

function parseSummary(value: unknown): WillAnalysisSummary {
  const item = record(value, "Will analysis summary");
  exact(item, ["overview", ...summaryListKeys, "confidence"], "Will analysis summary");
  const confidence = item.confidence;
  if (typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error("Will analysis confidence is invalid.");
  }
  return {
    overview: text(item.overview, "Will analysis overview", 4_000, true),
    ...Object.fromEntries(summaryListKeys.map((key) => [
      key,
      list(item[key], `Will analysis ${key}`, 100).map((entry) =>
        text(entry, `Will analysis ${key} entry`, 1_000),
      ),
    ])),
    confidence,
  } as WillAnalysisSummary;
}

export function parseWillExecutor(value: unknown, label: string): WillExecutor {
  const item = record(value, label);
  exact(item, ["name", "email", "phone", "informed"], label);
  return {
    name: text(item.name, `${label} name`, 160, true),
    email: text(item.email, `${label} email`, 254, true),
    phone: text(item.phone, `${label} phone`, 64, true),
    informed: boolean(item.informed, `${label} informed`),
  };
}

export function parseMobileWillVersion(value: unknown): MobileWillVersion {
  const item = record(value, "Will version");
  const keys = ["id", "documentId", "versionLabel", "uploadedAt", "signedDate",
    "status", "isCurrent", "currentConfirmed", "notes", "analysisStatus",
    "summaryReview", "summaryReviewNote", "detectedSummary"];
  exact(item, keys, "Will version");
  return {
    id: text(item.id, "Will version ID", 128),
    documentId: text(item.documentId, "Will document ID", 128),
    versionLabel: text(item.versionLabel, "Will version label", 160),
    uploadedAt: timestamp(item.uploadedAt, "Will upload time"),
    signedDate: date(item.signedDate, "Will signed date"),
    status: oneOf(item.status, ["draft", "signed", "superseded"], "Will version status"),
    isCurrent: boolean(item.isCurrent, "Will current-version flag"),
    currentConfirmed: boolean(item.currentConfirmed, "Will confirmation flag"),
    notes: text(item.notes, "Will version notes", 4_000, true),
    analysisStatus: oneOf(item.analysisStatus, ["processing", "ready", "failed", "not-requested"], "Will analysis status"),
    summaryReview: oneOf(item.summaryReview, ["unreviewed", "confirmed", "incorrect"], "Will summary review"),
    summaryReviewNote: text(item.summaryReviewNote, "Will summary review note", 4_000, true),
    ...(item.detectedSummary === undefined ? {} : { detectedSummary: parseSummary(item.detectedSummary) }),
  };
}

function parsePreparation(value: unknown) {
  const item = record(value, "Will preparation");
  const keys = willPreparationSections.map(({ key }) => key);
  exact(item, keys, "Will preparation");
  return Object.fromEntries(keys.map((key) => {
    const entry = record(item[key], "Will preparation item");
    exact(entry, ["status", "confirmedData", "updatedAt"], "Will preparation item");
    const parsed: WillPreparationItem = {
      status: oneOf(entry.status, ["not-started", "in-progress", "complete"], "Will preparation status"),
      confirmedData: text(entry.confirmedData, "Will preparation notes", 10_000, true),
      updatedAt: timestamp(entry.updatedAt, "Will preparation update time", true),
    };
    return [key, parsed];
  })) as Record<WillPreparationKey, WillPreparationItem>;
}

export function parseMobileWillRecord(value: unknown): MobileWillRecord {
  const item = record(value, "Will record");
  const keys = ["versions", "currentVersionId", "lastReviewedAt", "nextReviewAt",
    "solicitorName", "solicitorFirm", "solicitorPhone", "solicitorEmail",
    "referenceNumber", "originalLocationType", "originalLocationDetails",
    "originalOrganisation", "originalContactName", "originalPhone", "originalEmail",
    "originalReferenceNumber", "originalAccessNotes", "originalTrustedPeople",
    "primaryExecutor", "backupExecutor", "trustedPersonInformed", "notes",
    "preparation", "updatedAt"];
  exact(item, keys, "Will record");
  return {
    versions: list(item.versions, "Will versions", 100).map(parseMobileWillVersion),
    currentVersionId: text(item.currentVersionId, "Current will version ID", 128, true),
    lastReviewedAt: date(item.lastReviewedAt, "Will last-reviewed date"),
    nextReviewAt: date(item.nextReviewAt, "Will next-review date"),
    solicitorName: text(item.solicitorName, "Solicitor name", 160, true),
    solicitorFirm: text(item.solicitorFirm, "Solicitor firm", 160, true),
    solicitorPhone: text(item.solicitorPhone, "Solicitor phone", 64, true),
    solicitorEmail: text(item.solicitorEmail, "Solicitor email", 254, true),
    referenceNumber: text(item.referenceNumber, "Will reference", 160, true),
    originalLocationType: oneOf(item.originalLocationType, ["", "home", "solicitor", "secure-storage", "trusted-organisation", "other"], "Original will location type"),
    originalLocationDetails: text(item.originalLocationDetails, "Original will location", 2_000, true),
    originalOrganisation: text(item.originalOrganisation, "Original will organisation", 160, true),
    originalContactName: text(item.originalContactName, "Original will contact", 160, true),
    originalPhone: text(item.originalPhone, "Original will phone", 64, true),
    originalEmail: text(item.originalEmail, "Original will email", 254, true),
    originalReferenceNumber: text(item.originalReferenceNumber, "Original will reference", 160, true),
    originalAccessNotes: text(item.originalAccessNotes, "Original will access notes", 4_000, true),
    originalTrustedPeople: text(item.originalTrustedPeople, "Original will trusted people", 2_000, true),
    primaryExecutor: parseWillExecutor(item.primaryExecutor, "Primary executor"),
    backupExecutor: parseWillExecutor(item.backupExecutor, "Backup executor"),
    trustedPersonInformed: boolean(item.trustedPersonInformed, "Trusted-person informed flag"),
    notes: text(item.notes, "Will notes", 10_000, true),
    preparation: parsePreparation(item.preparation),
    updatedAt: timestamp(item.updatedAt, "Will update time", true),
  };
}
