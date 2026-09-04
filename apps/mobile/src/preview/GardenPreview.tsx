import { useMemo } from "react";

import type { LocalRecord } from "@diarydock/offline-store";

import { GardenScreen } from "@mobile/garden/GardenScreen";
import { PreviewStore } from "@mobile/preview/MobilePreview";

const ownerId = "f330a7d2-8ef1-4f6e-a6ec-118ea3a14f51";
const now = "2026-09-02T09:00:00.000Z";

function reminder(
  id: string,
  title: string,
  timeLabel: string,
  note: string,
): LocalRecord {
  return {
    id,
    entityType: "reminder",
    scope: { kind: "USER", id: ownerId },
    revision: "2",
    schemaVersion: 1,
    updatedAt: now,
    deletedAt: null,
    payload: {
      title,
      note,
      roomId: "garden",
      roomName: "Garden",
      group: "week",
      timeLabel,
      priority: "normal",
      origin: "USER_CREATED",
      reminderType: "custom",
      timeZone: "Europe/London",
    },
    syncState: "CLEAN",
  };
}

const records: LocalRecord[] = [
  reminder("garden-1", "Trim the hedge", "This Saturday", "Garden maintenance"),
  reminder("garden-2", "Check outdoor lighting", "This week", "Outdoor safety"),
  reminder(
    "garden-3",
    "Clean the lawnmower",
    "18 September",
    "Equipment service",
  ),
  {
    id: "garden-document-1",
    entityType: "document",
    scope: { kind: "USER", id: ownerId },
    revision: "3",
    schemaVersion: 1,
    updatedAt: now,
    deletedAt: null,
    payload: {
      documentId: "garden-document",
      title: "Garden landscaping quotation",
      category: "Home & Property",
      kind: "PDF",
      size: "840 KB",
      roomId: "garden",
      roomName: "Garden",
      reviewStatus: "needs-review",
      emergencyVisible: false,
      hasStoredFile: true,
    },
    syncState: "CLEAN",
  },
];

export function GardenPreview() {
  const store = useMemo(() => new PreviewStore(records), []);
  return (
    <GardenScreen
      accessToken="preview-access-token-that-is-long-enough"
      store={store}
      syncStatus="READY"
      synchronize={async () => true}
      onBack={() => undefined}
      onNavigate={() => undefined}
      onScan={() => undefined}
    />
  );
}
