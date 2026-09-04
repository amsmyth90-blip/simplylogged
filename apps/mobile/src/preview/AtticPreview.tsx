import { useMemo } from "react";

import type { AtticSnapshot } from "@diarydock/attic";
import type { LocalRecord } from "@diarydock/offline-store";

import { AtticScreen } from "@mobile/attic/AtticScreen";
import { PreviewStore } from "@mobile/preview/MobilePreview";

const ownerId = "f330a7d2-8ef1-4f6e-a6ec-118ea3a14f51";
const now = "2026-09-02T09:00:00.000Z";

const snapshot: AtticSnapshot = {
  schemaVersion: 2,
  revision: now,
  totalStoryCount: 3,
  cursor: null,
  nextCursor: null,
  stories: [
    {
      id: "story-1",
      title: "Sundays at Nana’s house",
      storyText: "Every Sunday the whole family gathered around Nana’s long kitchen table. There was always apple tart, strong tea and room for one more chair.",
      people: "Nana Rose, Mum, Sarah and Tom",
      place: "Belfast",
      dateLabel: "The 1980s",
      tags: ["Nana Rose", "Sunday", "family tradition"],
      images: [{ documentId: "attic-photo", fileName: "nana-kitchen.jpg" }],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "story-2",
      title: "Grandad’s first car",
      storyText: "Grandad saved for two years for his blue Morris Minor and drove it on every family holiday.",
      people: "Grandad James",
      place: "County Down",
      dateLabel: "1964",
      tags: ["Grandad", "first car"],
      images: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "story-3",
      title: "The seaside picnic",
      storyText: "A windy picnic that everyone still talks about.",
      people: "The whole family",
      place: "Newcastle",
      dateLabel: "Summer 1992",
      tags: ["holiday"],
      images: [],
      createdAt: now,
      updatedAt: now,
    },
  ],
};

const records: LocalRecord[] = [
  {
    id: "attic-reminder-1",
    entityType: "reminder",
    scope: { kind: "USER", id: ownerId },
    revision: "2",
    schemaVersion: 1,
    updatedAt: now,
    deletedAt: null,
    payload: {
      title: "Ask Mum about the old family album",
      note: "Add names beside the unlabelled photos",
      roomId: "attic",
      roomName: "Attic",
      group: "week",
      timeLabel: "This weekend",
      priority: "normal",
      origin: "USER_CREATED",
      reminderType: "custom",
      timeZone: "Europe/London",
    },
    syncState: "CLEAN",
  },
  {
    id: "attic-document-record",
    entityType: "document",
    scope: { kind: "USER", id: ownerId },
    revision: "3",
    schemaVersion: 1,
    updatedAt: now,
    deletedAt: null,
    payload: {
      documentId: "attic-photo",
      title: "Nana Rose in her kitchen",
      category: "Memories",
      kind: "Image",
      size: "1.4 MB",
      roomId: "attic",
      roomName: "Attic",
      reviewStatus: "reviewed",
      emergencyVisible: false,
      hasStoredFile: true,
    },
    syncState: "CLEAN",
  },
];

export function AtticPreview() {
  const store = useMemo(() => new PreviewStore(records), []);
  return (
    <AtticScreen
      accessToken="preview-access-token-that-is-long-enough"
      disableOnline
      initialSnapshot={snapshot}
      store={store}
      syncStatus="READY"
      synchronize={async () => true}
      onBack={() => undefined}
      onNavigate={() => undefined}
      onScan={() => undefined}
    />
  );
}
