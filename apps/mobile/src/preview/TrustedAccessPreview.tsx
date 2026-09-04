import {
  EMERGENCY_ACCESS_SCHEMA_VERSION,
  type EmergencyAccessDirectory,
} from "@diarydock/emergency-access";

import { TrustedAccessScreen } from "@mobile/emergency-access/TrustedAccessScreen";

const directory: EmergencyAccessDirectory = {
  schemaVersion: EMERGENCY_ACCESS_SCHEMA_VERSION,
  contacts: [{
    id: "27cf56cb-2c2f-4e28-96a4-48254bd9df3e",
    name: "Jane Smith",
    email: "jane@example.com",
    relation: "Neighbour",
    status: "ACTIVE",
    expiresAt: "2026-09-16T09:00:00.000Z",
    acceptedAt: "2026-09-02T10:00:00.000Z",
    grants: [{ id: "0f987909-621a-46a2-b404-673ee5624472", resourceType: "CONTACT", resourceId: "ec-jane", label: "David Green", grantedAt: "2026-09-02T10:05:00.000Z", revokedAt: null }],
  }, {
    id: "4d209ee7-4f7c-4ce7-97e0-64c43d6378c0",
    name: "David Green",
    email: "david@example.com",
    relation: "Brother",
    status: "PENDING",
    expiresAt: "2026-09-16T09:00:00.000Z",
    acceptedAt: null,
    grants: [],
  }],
  resources: [
    { type: "CONTACT", id: "ec-jane", label: "Jane Smith", detail: "Neighbour" },
    { type: "INSTRUCTION", id: "plan-fire", label: "Fire evacuation", detail: "Leave safely and meet by the front gate" },
    { type: "HOME_INFO", id: "Water stopcock", label: "Water stopcock", detail: "Home information" },
    { type: "DOCUMENT", id: "home-insurance", label: "Home insurance policy", detail: "Home & Property · Office" },
  ],
  received: [{
    id: "95a4c45f-e05d-43d0-8320-43223b5dfe8f",
    resourceType: "INSTRUCTION",
    label: "Power cut plan",
    snapshot: { title: "Power cut plan", summary: "What to check safely", steps: ["Find the torches", "Check the consumer unit"] },
    grantedAt: "2026-09-01T14:00:00.000Z",
    contactName: "Anna Green",
    contactRelation: "Sister",
  }],
  notifications: [{ id: "85620dd9-208c-4f0e-bc5a-4bf425065b5e", eventType: "INVITATION_ACCEPTED", label: "Jane Smith", createdAt: "2026-09-02T10:00:00.000Z" }],
};

export function TrustedAccessPreview() {
  return <TrustedAccessScreen accessToken="preview-access-token-long-enough-for-local-preview" disableOnline initialDirectory={directory} onBack={() => undefined} />;
}
