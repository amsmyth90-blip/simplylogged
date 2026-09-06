import {
  KITCHEN_CALENDAR_SCHEMA_VERSION,
  type KitchenCalendarSnapshot,
} from "@diarydock/kitchen";

import { KitchenCalendarScreen } from "@mobile/kitchen/KitchenCalendarScreen";
import { PreviewStore } from "./PreviewStore";

const snapshot: KitchenCalendarSnapshot = {
  schemaVersion: KITCHEN_CALENDAR_SCHEMA_VERSION,
  revision: "2026-09-06T12:00:00.000Z",
  events: [
    { id: "calendar-1", title: "Dentist", date: "2026-09-06", time: "10:30",
      category: "appointments", assignedTo: "Amy" },
    { id: "calendar-2", title: "Family dinner", date: "2026-09-06", time: "18:30",
      category: "meals" },
    { id: "calendar-3", title: "School pickup", date: "2026-09-08", time: "15:15",
      category: "school" },
  ],
};

export function KitchenCalendarPreview() {
  return <KitchenCalendarScreen accessToken="preview-access-token-that-is-never-sent"
    disableOnline initialSnapshot={snapshot} store={new PreviewStore()} syncStatus="IDLE"
    onBack={() => undefined} onNavigate={() => undefined} />;
}
