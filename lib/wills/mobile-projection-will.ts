import {
  createInitialWillRecord,
  willPreparationSections,
  type MobileWillRecord,
  type MobileWillVersion,
  type WillAnalysisSummary,
  type WillExecutor,
} from "@diarydock/wills";

import { bool, date, object, oneOf, text, timestamp, uniqueText } from "./projection-values.ts";

const summaryLists = [
  "executors", "beneficiaries", "guardians", "specificGifts",
  "charitableGifts", "residueOfEstate", "funeralWishesReferences",
  "conditionsOrInstructions", "questionsOrUnclearWording",
] as const;

function analysis(value: unknown): WillAnalysisSummary | undefined {
  const item = object(value);
  const confidence = typeof item.confidence === "number" && Number.isFinite(item.confidence)
    ? Math.min(1, Math.max(0, item.confidence))
    : 0;
  const overview = text(item.overview, 4_000);
  if (!overview && !summaryLists.some((key) => Array.isArray(item[key]))) return undefined;
  return {
    overview,
    ...Object.fromEntries(summaryLists.map((key) => [key, uniqueText(item[key], 1_000, 20)])),
    confidence,
  } as WillAnalysisSummary;
}

function version(value: unknown): MobileWillVersion | null {
  const item = object(value);
  const id = text(item.id, 128);
  const documentId = text(item.documentId, 128);
  const versionLabel = text(item.versionLabel, 160);
  if (!id || !documentId || !versionLabel) return null;
  const detectedSummary = analysis(item.detectedSummary);
  return {
    id,
    documentId,
    versionLabel,
    uploadedAt: timestamp(item.uploadedAt),
    signedDate: date(item.signedDate),
    status: oneOf(item.status, ["draft", "signed", "superseded"], "draft"),
    isCurrent: bool(item.isCurrent),
    currentConfirmed: item.currentConfirmed !== false,
    notes: text(item.notes, 4_000),
    analysisStatus: oneOf(item.analysisStatus, ["processing", "ready", "failed", "not-requested"], "not-requested"),
    summaryReview: oneOf(item.summaryReview, ["unreviewed", "confirmed", "incorrect"], "unreviewed"),
    summaryReviewNote: text(item.summaryReviewNote, 4_000),
    ...(detectedSummary ? { detectedSummary } : {}),
  };
}

function executor(value: unknown): WillExecutor {
  const item = object(value);
  return {
    name: text(item.name, 160),
    email: text(item.email, 254),
    phone: text(item.phone, 64),
    informed: bool(item.informed),
  };
}

export function projectMobileWill(value: unknown): MobileWillRecord {
  const item = object(value);
  const initial = createInitialWillRecord();
  const ids = new Set<string>();
  const versions = (Array.isArray(item.versions) ? item.versions : [])
    .slice(0, 10_000).map(version).filter((entry): entry is MobileWillVersion => {
      if (!entry || ids.has(entry.id)) return false;
      ids.add(entry.id);
      return true;
    });
  const requested = text(item.currentVersionId, 128);
  const currentId = ids.has(requested) ? requested : versions.find((entry) => entry.isCurrent)?.id ?? "";
  const preparationRoot = object(item.preparation);
  return {
    versions: versions.map((entry) => ({ ...entry, isCurrent: entry.id === currentId })),
    currentVersionId: currentId,
    lastReviewedAt: date(item.lastReviewedAt), nextReviewAt: date(item.nextReviewAt),
    solicitorName: text(item.solicitorName, 160), solicitorFirm: text(item.solicitorFirm, 160),
    solicitorPhone: text(item.solicitorPhone, 64), solicitorEmail: text(item.solicitorEmail, 254),
    referenceNumber: text(item.referenceNumber, 160),
    originalLocationType: oneOf(item.originalLocationType, ["", "home", "solicitor", "secure-storage", "trusted-organisation", "other"], ""),
    originalLocationDetails: text(item.originalLocationDetails, 2_000),
    originalOrganisation: text(item.originalOrganisation, 160), originalContactName: text(item.originalContactName, 160),
    originalPhone: text(item.originalPhone, 64), originalEmail: text(item.originalEmail, 254),
    originalReferenceNumber: text(item.originalReferenceNumber, 160), originalAccessNotes: text(item.originalAccessNotes, 4_000),
    originalTrustedPeople: text(item.originalTrustedPeople, 2_000),
    primaryExecutor: executor(item.primaryExecutor), backupExecutor: executor(item.backupExecutor),
    trustedPersonInformed: bool(item.trustedPersonInformed), notes: text(item.notes, 10_000),
    preparation: Object.fromEntries(willPreparationSections.map(({ key }) => {
      const entry = object(preparationRoot[key]);
      return [key, { status: oneOf(entry.status, ["not-started", "in-progress", "complete"], initial.preparation[key].status), confirmedData: text(entry.confirmedData, 10_000), updatedAt: timestamp(entry.updatedAt, true) }];
    })) as MobileWillRecord["preparation"],
    updatedAt: timestamp(item.updatedAt, true),
  };
}
