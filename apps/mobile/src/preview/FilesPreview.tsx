import type { LocalRecord, OfflineStore } from "@diarydock/offline-store";

import { FilesScreen } from "@mobile/files/FilesScreen";

const ownerId = "11111111-1111-4111-8111-111111111111";

function document(
  id: string,
  title: string,
  category: string,
  kind: "Image" | "Note" | "PDF" | "Scan",
  extras: Partial<LocalRecord["payload"]> = {},
): LocalRecord {
  return {
    id: crypto.randomUUID(),
    entityType: "document",
    scope: { kind: "USER", id: ownerId },
    revision: "3",
    schemaVersion: 1,
    updatedAt: "2026-08-29T10:30:00.000Z",
    deletedAt: null,
    syncState: "CLEAN",
    payload: {
      documentId: id,
      title,
      category,
      kind,
      size: kind === "Note" ? "Note" : "1.2 MB",
      reviewStatus: "reviewed",
      emergencyVisible: false,
      hasStoredFile: kind !== "Note",
      ...extras,
    },
  };
}

const records = [
  document("passport", "Current passport", "Identity", "PDF", {
    issuer: "HM Passport Office",
    dueDate: "2030-05-18",
    emergencyVisible: true,
  }),
  document("insurance", "Home insurance policy", "Home & Property", "PDF", {
    dueDate: "2026-10-14",
    reviewStatus: "needs-review",
  }),
  document("boiler", "Boiler service receipt", "Home & Property", "Scan"),
  document("travel", "Florence trip notes", "Travel & Access", "Note"),
  document("pet", "Milo vaccination record", "Pets & Outdoor", "Image"),
];

const store = {
  listRecords: async ({ entityType }: { entityType: string }) => entityType === "document" ? records : [],
  listConflicts: async () => [],
  resolveConflict: async () => undefined,
  cacheFile: async () => undefined,
  getCachedFile: async () => null,
  removeCachedFile: async () => undefined,
} as unknown as OfflineStore;

export function FilesPreview() {
  return <FilesScreen accessToken="preview-token-not-used-123456" store={store} syncStatus="READY" synchronize={async () => true} onNavigate={() => undefined} />;
}
