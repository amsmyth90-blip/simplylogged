import {
  EMERGENCY_SCHEMA_VERSION,
  type EmergencyCareContact,
  type EmergencyContact,
  type EmergencyHomeInfo,
  type EmergencyPlan,
  type EmergencySnapshot,
} from "./types.ts";
import { array, exact, optionalText, record, text } from "./parser-helpers.ts";

function revision(value: unknown) {
  if (value === null) return null;
  const parsed = text(value, "Emergency revision", 40);
  if (!Number.isFinite(Date.parse(parsed))) throw new Error("Emergency revision is invalid.");
  return parsed;
}

function contact(value: unknown): EmergencyContact {
  const item = record(value, "Emergency contact");
  exact(item, ["id", "name", "relation", "phone", "note"], "Emergency contact");
  return {
    id: text(item.id, "Emergency contact ID", 128),
    name: text(item.name, "Emergency contact name", 120),
    relation: text(item.relation, "Emergency contact relationship", 120),
    phone: text(item.phone, "Emergency contact phone", 40),
    note: optionalText(item.note, "Emergency contact note", 300),
  };
}

function plan(value: unknown): EmergencyPlan {
  const item = record(value, "Emergency plan");
  exact(item, ["id", "title", "summary", "steps"], "Emergency plan");
  return {
    id: text(item.id, "Emergency plan ID", 128),
    title: text(item.title, "Emergency plan title", 160),
    summary: text(item.summary, "Emergency plan summary", 400),
    steps: array(item.steps, "Emergency plan steps", 20)
      .map((step) => text(step, "Emergency plan step", 500)),
  };
}

function homeInfo(value: unknown): EmergencyHomeInfo {
  const item = record(value, "Emergency home information");
  exact(item, ["label", "value"], "Emergency home information");
  return {
    label: text(item.label, "Emergency information label", 120),
    value: text(item.value, "Emergency information value", 500),
  };
}

function careContact(value: unknown): EmergencyCareContact {
  const item = record(value, "Care contact");
  exact(item, ["id", "name", "relation", "detail", "phone", "initials"], "Care contact");
  return {
    id: text(item.id, "Care contact ID", 128),
    name: text(item.name, "Care contact name", 120),
    relation: text(item.relation, "Care contact relationship", 120),
    detail: text(item.detail, "Care contact detail", 300),
    phone: text(item.phone, "Care contact phone", 40),
    initials: text(item.initials, "Care contact initials", 8),
  };
}

export function parseEmergencySnapshot(value: unknown): EmergencySnapshot {
  const item = record(value, "Emergency snapshot");
  exact(item, ["schemaVersion", "revision", "contacts", "plans", "homeInfo", "careContacts"], "Emergency snapshot");
  if (item.schemaVersion !== EMERGENCY_SCHEMA_VERSION) {
    throw new Error("Please update DiaryDock to open Emergency.");
  }
  return {
    schemaVersion: EMERGENCY_SCHEMA_VERSION,
    revision: revision(item.revision),
    contacts: array(item.contacts, "Emergency contacts", 100).map(contact),
    plans: array(item.plans, "Emergency plans", 100).map(plan),
    homeInfo: array(item.homeInfo, "Emergency home information", 100).map(homeInfo),
    careContacts: array(item.careContacts, "Care contacts", 100).map(careContact),
  };
}
