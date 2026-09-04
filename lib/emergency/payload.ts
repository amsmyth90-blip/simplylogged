import {
  EMERGENCY_SCHEMA_VERSION,
  parseEmergencySnapshot,
  type EmergencyMutation,
  type EmergencySnapshot,
} from "@diarydock/emergency";

type AppStatePayload = Record<string, unknown>;
type EmergencyListKey = "careContacts" | "contacts" | "homeInfo" | "plans";

function object(value: unknown): AppStatePayload {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as AppStatePayload
    : {};
}

function projectedItems(value: unknown, maximum = 100) {
  return Array.isArray(value) ? value.slice(0, maximum) : [];
}

function validItems(value: unknown, key: EmergencyListKey, revision: string | null) {
  const valid: unknown[] = [];
  for (const item of projectedItems(value)) {
    const candidate = {
      schemaVersion: EMERGENCY_SCHEMA_VERSION,
      revision,
      contacts: key === "contacts" ? [item] : [],
      plans: key === "plans" ? [item] : [],
      homeInfo: key === "homeInfo" ? [item] : [],
      careContacts: key === "careContacts" ? [item] : [],
    };
    try {
      parseEmergencySnapshot(candidate);
      valid.push(item);
    } catch { /* Ignore malformed legacy entries without exposing them. */ }
  }
  return valid;
}

export function projectEmergencySnapshot(
  payload: unknown,
  revision: string | null,
): EmergencySnapshot {
  const state = object(payload);
  return parseEmergencySnapshot({
    schemaVersion: EMERGENCY_SCHEMA_VERSION,
    revision,
    contacts: validItems(state.emergencyContacts, "contacts", revision),
    plans: validItems(state.emergencyPlans, "plans", revision),
    homeInfo: validItems(state.homeInfo, "homeInfo", revision),
    careContacts: validItems(state.careContacts, "careContacts", revision),
  });
}

function existingArray(payload: AppStatePayload, key: string) {
  const value = payload[key];
  return Array.isArray(value) ? [...value] : [];
}

function append(payload: AppStatePayload, key: string, value: unknown) {
  const current = existingArray(payload, key);
  if (current.length >= 100) throw new Error("EMERGENCY_CAPACITY_REACHED");
  payload[key] = [...current, value];
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part[0]?.toUpperCase()).join("") || "N";
}

export function mutateEmergencyPayload(
  current: unknown,
  mutation: EmergencyMutation,
  createId: () => string = () => crypto.randomUUID(),
) {
  const payload = structuredClone(object(current));
  if (mutation.operation === "ADD_CONTACT") {
    const id = createId();
    append(payload, "emergencyContacts", {
      id: `ec-${id}`,
      name: mutation.name,
      relation: mutation.relation,
      phone: mutation.phone,
      ...(mutation.note ? { note: mutation.note } : {}),
    });
    append(payload, "careContacts", {
      id: `care-${id}`,
      name: mutation.name,
      relation: mutation.relation,
      detail: mutation.note ?? "Added from Emergency",
      phone: mutation.phone,
      initials: initials(mutation.name),
    });
  } else if (mutation.operation === "ADD_PLAN") {
    append(payload, "emergencyPlans", {
      id: `plan-${createId()}`,
      title: mutation.title,
      summary: mutation.summary,
      steps: [...mutation.steps],
    });
  } else {
    append(payload, "homeInfo", { label: mutation.label, value: mutation.value });
  }
  return payload;
}
