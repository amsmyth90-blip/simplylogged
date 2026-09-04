import { array, date, exact, record, text, uuid } from "./helpers.ts";
import {
  EMERGENCY_ACCESS_SCHEMA_VERSION,
  type EmergencyAccessDirectory,
  type EmergencyAccessGrant,
  type EmergencyAccessNotice,
  type EmergencyAccessResource,
  type EmergencyResourceType,
  type ReceivedEmergencyGrant,
  type TrustedEmergencyContact,
  type TrustedContactStatus,
} from "./types.ts";

const resourceTypes = new Set([
  "CONTACT",
  "DOCUMENT",
  "HOME_INFO",
  "INSTRUCTION",
]);
const statuses = new Set(["ACTIVE", "EXPIRED", "PENDING", "REVOKED"]);
const eventTypes = new Set([
  "ACCESS_GRANTED",
  "ACCESS_REVOKED",
  "CONTACT_REVOKED",
  "INVITATION_ACCEPTED",
]);

function resourceType(value: unknown) {
  const parsed = text(value, "Emergency resource type", 20);
  if (!resourceTypes.has(parsed))
    throw new Error("Emergency resource type is invalid.");
  return parsed as EmergencyResourceType;
}

function status(value: unknown) {
  const parsed = text(value, "Trusted contact status", 16);
  if (!statuses.has(parsed))
    throw new Error("Trusted contact status is invalid.");
  return parsed as TrustedContactStatus;
}

function grant(value: unknown): EmergencyAccessGrant {
  const item = record(value, "Emergency access grant");
  exact(
    item,
    ["id", "resourceType", "resourceId", "label", "grantedAt", "revokedAt"],
    "Emergency access grant",
  );
  return {
    id: uuid(item.id, "Grant ID"),
    resourceType: resourceType(item.resourceType),
    resourceId: text(item.resourceId, "Resource ID", 180),
    label: text(item.label, "Grant label", 160),
    grantedAt: date(item.grantedAt, "Granted date")!,
    revokedAt: date(item.revokedAt, "Revoked date", true),
  };
}

function contact(value: unknown): TrustedEmergencyContact {
  const item = record(value, "Trusted contact");
  exact(
    item,
    [
      "id",
      "name",
      "email",
      "relation",
      "status",
      "expiresAt",
      "acceptedAt",
      "grants",
    ],
    "Trusted contact",
  );
  const email = text(item.email, "Trusted contact email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Trusted contact email is invalid.");
  return {
    id: uuid(item.id, "Trusted contact ID"),
    name: text(item.name, "Trusted contact name", 120),
    email,
    relation: text(item.relation, "Trusted contact relationship", 120, true),
    status: status(item.status),
    expiresAt: date(item.expiresAt, "Trusted contact expiry")!,
    acceptedAt: date(item.acceptedAt, "Trusted contact acceptance", true),
    grants: array(item.grants, "Emergency access grants", 300).map(grant),
  };
}

function resource(value: unknown): EmergencyAccessResource {
  const item = record(value, "Emergency access resource");
  exact(item, ["type", "id", "label", "detail"], "Emergency access resource");
  return {
    type: resourceType(item.type),
    id: text(item.id, "Resource ID", 180),
    label: text(item.label, "Resource label", 160),
    detail: text(item.detail, "Resource detail", 300, true),
  };
}

function notice(value: unknown): EmergencyAccessNotice {
  const item = record(value, "Emergency access notice");
  exact(
    item,
    ["id", "eventType", "label", "createdAt"],
    "Emergency access notice",
  );
  const eventType = text(item.eventType, "Emergency access event", 32);
  if (!eventTypes.has(eventType))
    throw new Error("Emergency access event is invalid.");
  return {
    id: uuid(item.id, "Notice ID"),
    eventType: eventType as EmergencyAccessNotice["eventType"],
    label: text(item.label, "Notice label", 160, true),
    createdAt: date(item.createdAt, "Notice date")!,
  };
}

function safeSnapshot(value: unknown, type: EmergencyResourceType) {
  const item = record(value, "Shared emergency snapshot");
  if (new TextEncoder().encode(JSON.stringify(item)).byteLength > 12_000)
    throw new Error("Shared emergency snapshot is invalid.");
  if (type === "DOCUMENT") {
    exact(
      item,
      ["title", "category", "roomName", "downloadable"],
      "Shared emergency document",
    );
    if (typeof item.downloadable !== "boolean")
      throw new Error("Shared emergency document is invalid.");
    return {
      title: text(item.title, "Shared document title", 240),
      category: text(item.category, "Shared document category", 160, true),
      roomName: text(item.roomName, "Shared document room", 160, true),
      downloadable: item.downloadable,
    };
  }
  if (type === "INSTRUCTION") {
    exact(item, ["title", "summary", "steps"], "Shared emergency instruction");
    return {
      title: text(item.title, "Shared instruction title", 160),
      summary: text(item.summary, "Shared instruction summary", 400, true),
      steps: array(item.steps, "Shared instruction steps", 20).map((step) =>
        text(step, "Shared instruction step", 500),
      ),
    };
  }
  if (type === "CONTACT") {
    exact(
      item,
      ["name", "relation", "phone", "note"],
      "Shared emergency contact",
    );
    return {
      name: text(item.name, "Shared contact name", 120),
      relation: text(item.relation, "Shared contact relationship", 120, true),
      phone: text(item.phone, "Shared contact phone", 40, true),
      note: text(item.note, "Shared contact note", 300, true),
    };
  }
  exact(item, ["label", "value"], "Shared emergency home information");
  return {
    label: text(item.label, "Shared information label", 120),
    value: text(item.value, "Shared information value", 500, true),
  };
}

function received(value: unknown): ReceivedEmergencyGrant {
  const item = record(value, "Received emergency grant");
  exact(
    item,
    [
      "id",
      "resourceType",
      "label",
      "snapshot",
      "grantedAt",
      "contactName",
      "contactRelation",
    ],
    "Received emergency grant",
  );
  const type = resourceType(item.resourceType);
  return {
    id: uuid(item.id, "Received grant ID"),
    resourceType: type,
    label: text(item.label, "Received grant label", 160),
    snapshot: safeSnapshot(item.snapshot, type),
    grantedAt: date(item.grantedAt, "Received grant date")!,
    contactName: text(item.contactName, "Sharing contact name", 120),
    contactRelation: text(
      item.contactRelation,
      "Sharing contact relationship",
      120,
      true,
    ),
  };
}

export function parseEmergencyAccessDirectory(
  value: unknown,
): EmergencyAccessDirectory {
  const item = record(value, "Emergency access directory");
  exact(
    item,
    ["schemaVersion", "contacts", "resources", "received", "notifications"],
    "Emergency access directory",
  );
  if (item.schemaVersion !== EMERGENCY_ACCESS_SCHEMA_VERSION)
    throw new Error("Please update DiaryDock to manage trusted access.");
  return {
    schemaVersion: EMERGENCY_ACCESS_SCHEMA_VERSION,
    contacts: array(item.contacts, "Trusted contacts", 50).map(contact),
    resources: array(item.resources, "Emergency resources", 300).map(resource),
    received: array(item.received, "Received emergency grants", 100).map(
      received,
    ),
    notifications: array(
      item.notifications,
      "Emergency access notices",
      20,
    ).map(notice),
  };
}

export { resourceType };
