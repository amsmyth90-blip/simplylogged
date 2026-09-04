import {
  willPreparationSections,
  type WillExecutor,
  type WillPreparationItem,
  type WillPreparationKey,
  type WillRecord,
} from "./will-types.ts";

function emptyExecutor(): WillExecutor {
  return { name: "", email: "", phone: "", informed: false };
}

function emptyPreparation(): Record<WillPreparationKey, WillPreparationItem> {
  return Object.fromEntries(willPreparationSections.map(({ key }) => [
    key,
    { status: "not-started", confirmedData: "", updatedAt: "" },
  ])) as Record<WillPreparationKey, WillPreparationItem>;
}

export function createInitialWillRecord(): WillRecord {
  return {
    versions: [], currentVersionId: "", lastReviewedAt: "", nextReviewAt: "",
    solicitorName: "", solicitorFirm: "", solicitorPhone: "", solicitorEmail: "",
    referenceNumber: "", originalLocationType: "", originalLocationDetails: "",
    originalOrganisation: "", originalContactName: "", originalPhone: "",
    originalEmail: "", originalReferenceNumber: "", originalAccessNotes: "",
    originalTrustedPeople: "", primaryExecutor: emptyExecutor(),
    backupExecutor: emptyExecutor(), trustedPersonInformed: false, notes: "",
    preparation: emptyPreparation(), updatedAt: "",
  };
}

export function hydrateWillRecord(record: Partial<WillRecord> | null | undefined): WillRecord {
  const initial = createInitialWillRecord();
  const versions = Array.isArray(record?.versions) ? record.versions : [];
  const requested = record?.currentVersionId ?? "";
  const currentId = versions.some((version) => version.id === requested)
    ? requested
    : versions.find((version) => version.isCurrent)?.id ?? "";
  return {
    ...initial,
    ...record,
    versions: versions.map((version) => ({
      ...version,
      summaryReview: version.summaryReview ?? "unreviewed",
      summaryReviewNote: version.summaryReviewNote ?? "",
      currentConfirmed: version.currentConfirmed ?? true,
      isCurrent: version.id === currentId,
    })),
    currentVersionId: currentId,
    primaryExecutor: { ...initial.primaryExecutor, ...(record?.primaryExecutor ?? {}) },
    backupExecutor: { ...initial.backupExecutor, ...(record?.backupExecutor ?? {}) },
    preparation: Object.fromEntries(willPreparationSections.map(({ key }) => [
      key,
      { ...initial.preparation[key], ...(record?.preparation?.[key] ?? {}) },
    ])) as Record<WillPreparationKey, WillPreparationItem>,
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
      status: version.id === versionId
        ? version.status === "superseded" ? "signed" : version.status
        : version.isCurrent && version.status !== "draft" ? "superseded" : version.status,
    })),
    updatedAt: new Date().toISOString(),
  };
}

export function getCurrentWillVersion(record: WillRecord) {
  return record.versions.find((version) => version.id === record.currentVersionId) ?? null;
}

export function getWillDashboardStatus(record: WillRecord) {
  const current = getCurrentWillVersion(record);
  if (!current) return { label: "No will added", tone: "empty" as const };
  if (!current.currentConfirmed) return { label: "Current version needs confirmation", tone: "attention" as const };
  if (record.nextReviewAt && new Date(record.nextReviewAt) < new Date(new Date().toDateString())) {
    return { label: "Review recommended", tone: "attention" as const };
  }
  if (current.status === "draft") return { label: "Draft uploaded", tone: "progress" as const };
  return { label: "Signed copy stored", tone: "complete" as const };
}

export function getPreparationProgress(
  record: Pick<WillRecord, "preparation">,
) {
  const items = willPreparationSections.map(({ key }) => record.preparation[key]);
  return {
    complete: items.filter((item) => item.status === "complete").length,
    started: items.filter((item) => item.status !== "not-started").length,
    total: items.length,
  };
}
