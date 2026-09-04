import { useMemo } from "react";

import {
  KITCHEN_NOTICEBOARD_SCHEMA_VERSION,
  type KitchenNoticeboardSnapshot,
} from "@diarydock/kitchen";

import { KitchenNoticeboardScreen } from "@mobile/kitchen/KitchenNoticeboardScreen";
import { PreviewStore } from "./MobilePreview";

const createdAt = "2026-09-02T08:30:00.000Z";
const snapshot: KitchenNoticeboardSnapshot = {
  schemaVersion: KITCHEN_NOTICEBOARD_SCHEMA_VERSION,
  revision: createdAt,
  assignees: ["Family", "Amy", "Sam"],
  notices: [
    { id: "notice-school", title: "School forms", detail: "Sign and return the trip form",
      category: "School", assignedTo: "Amy", due: "Tomorrow", colour: "blue",
      pinned: true, completed: false, archived: false, createdAt, source: "photo" },
    { id: "notice-bins", title: "Recycling tonight", detail: "Glass and cardboard this week",
      category: "Home", assignedTo: "Family", due: "Tonight", colour: "sage",
      pinned: true, completed: false, archived: false, createdAt, source: "manual" },
    { id: "notice-dentist", title: "Dentist appointment", detail: "Leave home by 2:45 pm",
      category: "Health", assignedTo: "Sam", due: "Fri 4 Sep", colour: "cream",
      pinned: false, completed: false, archived: false, createdAt, source: "voice" },
    { id: "notice-weekend", title: "Saturday picnic", detail: "Bring the blue blanket",
      category: "Plans", assignedTo: "Family", due: "This weekend", colour: "clay",
      pinned: false, completed: true, archived: false, createdAt, completedAt: createdAt },
    { id: "notice-archive", title: "Book the boiler service", detail: "Completed last week",
      category: "Home", assignedTo: "Amy", due: "This week", colour: "sage",
      pinned: false, completed: true, archived: true, createdAt,
      completedAt: createdAt, archivedAt: createdAt },
  ],
};

export function KitchenNoticeboardPreview() {
  const store = useMemo(() => new PreviewStore(), []);
  return <KitchenNoticeboardScreen accessToken="preview-access-token-that-is-never-sent"
    disableOnline initialSnapshot={snapshot} store={store} syncStatus="READY"
    onBack={() => undefined} onNavigate={() => undefined} />;
}
