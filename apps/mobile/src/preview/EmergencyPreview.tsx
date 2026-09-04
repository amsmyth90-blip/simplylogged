import { useMemo } from "react";

import {
  EMERGENCY_SCHEMA_VERSION,
  type EmergencySnapshot,
} from "@diarydock/emergency";

import { EmergencyScreen } from "@mobile/emergency/EmergencyScreen";
import { PreviewStore } from "./MobilePreview";

const snapshot: EmergencySnapshot = {
  schemaVersion: EMERGENCY_SCHEMA_VERSION,
  revision: "2026-09-02T08:30:00.000Z",
  contacts: [
    { id: "ec-jane", name: "Jane Smith", relation: "Neighbour", phone: "07700 900 123", note: "Holds a spare key" },
    { id: "ec-david", name: "David Green", relation: "Brother", phone: "07700 900 456" },
  ],
  careContacts: [
    { id: "care-jane", name: "Jane Smith", relation: "Neighbour", detail: "Holds a spare key", phone: "07700 900 123", initials: "JS" },
  ],
  plans: [{
    id: "plan-fire",
    title: "Fire evacuation",
    summary: "Leave safely and meet by the front gate",
    steps: ["Leave by the nearest safe exit", "Meet beside the front gate", "Call the emergency services from outside"],
  }],
  homeInfo: [
    { label: "Water stopcock", value: "Utility cupboard beside the hall" },
    { label: "Electricity isolation", value: "Main switch in the garage consumer unit" },
  ],
};

export function EmergencyPreview() {
  const store = useMemo(() => new PreviewStore(), []);
  return (
    <EmergencyScreen
      accessToken="preview-access-token-long-enough-for-local-preview"
      disableOnline={new URLSearchParams(window.location.search).get("online") !== "true"}
      initialSnapshot={snapshot}
      store={store}
      syncStatus="READY"
      onBack={() => undefined}
      onTrustedAccess={() => undefined}
    />
  );
}
