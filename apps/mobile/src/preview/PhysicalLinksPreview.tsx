import { PHYSICAL_LINKS_SCHEMA_VERSION } from "@diarydock/physical-links";

import { PhysicalLinksScreen } from "@mobile/physical-links/PhysicalLinksScreen";
import { PreviewStore } from "@mobile/preview/PreviewStore";

const store = new PreviewStore([]);
const timestamp = "2026-09-04T10:00:00.000Z";

export function PhysicalLinksPreview() {
  return <PhysicalLinksScreen accessToken="preview-token-not-used-123456" disableOnline
    store={store} syncStatus="READY" onBack={() => undefined} onNavigate={() => undefined}
    initialSnapshot={{ schemaVersion: PHYSICAL_LINKS_SCHEMA_VERSION, revision: "7",
      detailsComplete: true, assets: [
      { id: "11111111-1111-4111-8111-111111111111", name: "Kitchen boiler",
        category: "BOILER", location: "Utility room", manufacturer: "Worcester",
        model: "Greenstar 30i", serialNumberMasked: "•••• 6821", warrantyDueAt: null,
        nextServiceAt: "2026-11-18T12:00:00.000Z", maintenanceNotes: "Annual service due each autumn.",
        createdAt: timestamp, updatedAt: timestamp },
      { id: "22222222-2222-4222-8222-222222222222", name: "Washing machine",
        category: "APPLIANCE", location: "Utility room", manufacturer: "Bosch", model: "Series 6",
        serialNumberMasked: "•••• 1940", warrantyDueAt: "2027-03-12T12:00:00.000Z",
        nextServiceAt: null, maintenanceNotes: "", createdAt: timestamp, updatedAt: timestamp },
    ], links: [
      { id: "33333333-3333-4333-8333-333333333333", name: "Boiler cupboard tag",
        resourceId: "11111111-1111-4111-8111-111111111111", status: "ACTIVE", expiresAt: null,
        lastUsedAt: "2026-09-01T09:25:00.000Z", useCount: 4, createdAt: timestamp, updatedAt: timestamp },
    ] }} />;
}
