import { HOME_HANDOVER_SCHEMA_VERSION } from "@diarydock/home-handover";

import { HomeHandoverScreen } from "@mobile/home-handover/HomeHandoverScreen";
import { PreviewStore } from "@mobile/preview/PreviewStore";

const store = new PreviewStore([]);
const timestamp = "2026-09-04T10:00:00.000Z";
const boilerId = "11111111-1111-4111-8111-111111111111";
const washerId = "22222222-2222-4222-8222-222222222222";
const manualId = "33333333-3333-4333-8333-333333333333";

export function HomeHandoverPreview() {
  return <HomeHandoverScreen accessToken="preview-token-not-used-123456" disableOnline
    store={store} syncStatus="READY" onBack={() => undefined} onNavigate={() => undefined}
    initialSnapshot={{ schemaVersion: HOME_HANDOVER_SCHEMA_VERSION, detailsComplete: true,
      draft: { id: "44444444-4444-4444-8444-444444444444", name: "Our home handover",
        revision: timestamp }, candidates: [
        { resourceType: "ASSET", resourceId: boilerId, label: "Kitchen boiler",
          detail: "BOILER · Utility room · Worcester · Greenstar 30i", selected: true },
        { resourceType: "ASSET", resourceId: washerId, label: "Washing machine",
          detail: "APPLIANCE · Utility room · Bosch · Series 6", selected: false },
        { resourceType: "DOCUMENT", resourceId: manualId, label: "Boiler manual",
          detail: "Appliance manual · Linked to an eligible home item", selected: true },
      ], items: [
        { id: "55555555-5555-4555-8555-555555555555", resourceType: "ASSET",
          resourceId: boilerId, label: "Kitchen boiler",
          detail: "BOILER · Utility room · Worcester · Greenstar 30i", selected: true,
          addedAt: timestamp },
        { id: "66666666-6666-4666-8666-666666666666", resourceType: "DOCUMENT",
          resourceId: manualId, label: "Boiler manual", detail: "Appliance manual",
          selected: true, addedAt: timestamp },
      ], publication: null, received: [],
      exclusions: ["Private and unselected files", "Financial records and receipts",
        "Identity, legal and correspondence records", "Health, travel, pet and insurance records",
        "Emergency information", "Vault or future encrypted Vault content"] }} />;
}
