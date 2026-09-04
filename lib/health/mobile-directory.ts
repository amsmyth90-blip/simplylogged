import type {
  HealthContact,
  HealthDirectory,
  HealthFamilyProfile,
  HealthRecord,
} from "@diarydock/health";

import { object, text } from "./mobile-projection-values.ts";

function unique<T extends { id: string }>(items: T[]) {
  const ids = new Set<string>();
  return items.filter((item) => {
    if (!item.id || ids.has(item.id)) return false;
    ids.add(item.id);
    return true;
  });
}

function familyProfile(value: unknown): HealthFamilyProfile | null {
  const item = object(value);
  const profile = {
    id: text(item.id, 128),
    name: text(item.name, 160),
    role: text(item.role, 120),
  };
  return profile.id && profile.name ? profile : null;
}

function contactName(item: Record<string, unknown>) {
  return (
    `${text(item.firstName, 80)} ${text(item.lastName, 80)}`.trim() ||
    text(item.company, 160)
  ).slice(0, 160);
}

function phone(value: unknown) {
  const candidate = text(value, 64);
  return /^[0-9+(). -]{3,64}$/.test(candidate) ? candidate : "";
}

function contact(value: unknown): HealthContact | null {
  const item = object(value);
  const projected = {
    id: text(item.id, 128),
    name: contactName(item),
    role: text(item.role, 160),
    company: text(item.company, 160),
    phone: phone(item.phone),
  };
  return projected.id && projected.name ? projected : null;
}

export function projectHealthDirectory(
  payload: unknown,
  health: Pick<HealthRecord, "familyMemberIds" | "profile">,
): HealthDirectory {
  const root = object(payload);
  const selectedContacts = new Set([
    health.profile.gpContactId,
    health.profile.pharmacyContactId,
    health.profile.emergencyContactId,
  ]);
  const contactsRoot = object(root.professionalContacts);
  const contacts = (Array.isArray(contactsRoot.contacts)
    ? contactsRoot.contacts
    : [])
    .slice(0, 10_000)
    .filter((value) => {
      const item = object(value);
      return item.category === "Healthcare" ||
        item.isEmergencyContact === true ||
        selectedContacts.has(text(item.id, 128));
    })
    .map(contact)
    .filter((item): item is HealthContact => Boolean(item))
    .sort((left, right) => Number(selectedContacts.has(right.id)) - Number(selectedContacts.has(left.id)));
  const selectedFamily = new Set(health.familyMemberIds);
  const familyProfiles = (Array.isArray(root.householdMembers)
    ? root.householdMembers
    : [])
    .slice(0, 1_000)
    .map(familyProfile)
    .filter((item): item is HealthFamilyProfile => Boolean(item))
    .sort((left, right) => Number(selectedFamily.has(right.id)) - Number(selectedFamily.has(left.id)));
  return {
    contacts: unique(contacts).slice(0, 200),
    familyProfiles: unique(familyProfiles).slice(0, 100),
  };
}
