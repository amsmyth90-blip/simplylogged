import { exact, record, text, uuid } from "./helpers.ts";
import { resourceType } from "./parser.ts";
import type { EmergencyAccessMutation } from "./types.ts";

export function parseEmergencyAccessMutation(value: unknown): EmergencyAccessMutation {
  const item = record(value, "Emergency access update");
  const operation = text(item.operation, "Emergency access operation", 32);
  if (operation === "CREATE_CONTACT") {
    exact(item, ["operation", "name", "email", "relation"], "Emergency access update");
    const email = text(item.email, "Trusted contact email", 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Trusted contact email is invalid.");
    return { operation, name: text(item.name, "Trusted contact name", 120), email, relation: text(item.relation, "Trusted contact relationship", 120, true) };
  }
  if (operation === "REVOKE_CONTACT") {
    exact(item, ["operation", "contactId"], "Emergency access update");
    return { operation, contactId: uuid(item.contactId, "Trusted contact ID") };
  }
  if (operation === "SET_GRANT") {
    exact(item, ["operation", "contactId", "resourceType", "resourceId", "granted"], "Emergency access update");
    if (typeof item.granted !== "boolean") throw new Error("Emergency grant choice is invalid.");
    return { operation, contactId: uuid(item.contactId, "Trusted contact ID"), resourceType: resourceType(item.resourceType), resourceId: text(item.resourceId, "Emergency resource ID", 180), granted: item.granted };
  }
  throw new Error("Emergency access operation is invalid.");
}
