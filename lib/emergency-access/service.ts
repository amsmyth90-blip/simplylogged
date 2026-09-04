import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  EMERGENCY_ACCESS_SCHEMA_VERSION,
  parseEmergencyAccessDirectory,
  type EmergencyAccessDirectory,
  type EmergencyAccessMutation,
  type EmergencyResourceType,
} from "@diarydock/emergency-access";

import { createEmergencyInviteToken, emergencyInvitePath } from "@/lib/emergency-access";
import { projectEmergencySnapshot } from "@/lib/emergency/payload";

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown) {
  return Array.isArray(value) ? value.map(record) : [];
}

function clean(value: unknown, maximum = 180) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function nullableDate(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null;
}

function sharingContact(value: unknown) {
  const item = Array.isArray(value) ? record(value[0]) : record(value);
  return { name: clean(item.name, 120), relation: clean(item.relation, 120) };
}

function snapshotFor(type: EmergencyResourceType, value: unknown) {
  const item = record(value);
  if (type === "DOCUMENT") return {
    title: clean(item.title, 240),
    category: clean(item.category, 160),
    roomName: clean(item.roomName, 160),
    downloadable: item.downloadable === true,
  };
  if (type === "INSTRUCTION") return {
    title: clean(item.title, 160),
    summary: clean(item.summary, 400),
    steps: Array.isArray(item.steps)
      ? item.steps.filter((step): step is string => typeof step === "string")
        .map((step) => step.trim().slice(0, 500)).filter(Boolean).slice(0, 20)
      : [],
  };
  if (type === "CONTACT") return {
    name: clean(item.name, 120),
    relation: clean(item.relation, 120),
    phone: clean(item.phone, 40),
    note: clean(item.note, 300),
  };
  return { label: clean(item.label, 120), value: clean(item.value, 500) };
}

function resourceType(value: unknown): EmergencyResourceType | null {
  return value === "CONTACT" || value === "DOCUMENT"
    || value === "HOME_INFO" || value === "INSTRUCTION" ? value : null;
}

export async function loadEmergencyAccessDirectory(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ directory: EmergencyAccessDirectory | null; error: "UNAVAILABLE" | null }> {
  const [contacts, grants, documents, state, received, notifications] = await Promise.all([
    supabase.from("trusted_emergency_contacts")
      .select("id,name,email,relation,status,expires_at,accepted_at,created_at")
      .eq("owner_id", userId).order("created_at", { ascending: false }).limit(50),
    supabase.from("emergency_access_grants")
      .select("id,trusted_contact_id,resource_type,resource_id,label,granted_at,revoked_at")
      .eq("owner_id", userId).order("granted_at", { ascending: false }).limit(300),
    supabase.from("documents").select("id,title,category,room_name")
      .eq("user_id", userId).eq("emergency_visible", true)
      .order("updated_at", { ascending: false }).limit(100),
    supabase.from("app_state").select("payload,updated_at").eq("id", userId).maybeSingle(),
    supabase.from("emergency_access_grants")
      .select("id,resource_type,label,snapshot,granted_at,trusted_emergency_contacts!inner(name,relation,status)")
      .neq("owner_id", userId).is("revoked_at", null)
      .order("granted_at", { ascending: false }).limit(100),
    supabase.from("emergency_access_notifications").select("id,event_type,label,created_at")
      .or(`owner_id.eq.${userId},recipient_user_id.eq.${userId}`)
      .order("created_at", { ascending: false }).limit(20),
  ]);
  if (contacts.error || grants.error || documents.error || state.error
    || received.error || notifications.error) return { directory: null, error: "UNAVAILABLE" };
  try {
    const legacy = projectEmergencySnapshot(
      record(state.data).payload,
      nullableDate(record(state.data).updated_at),
    );
    const grantRows = rows(grants.data);
    const directory = parseEmergencyAccessDirectory({
      schemaVersion: EMERGENCY_ACCESS_SCHEMA_VERSION,
      contacts: rows(contacts.data).map((contact) => ({
        id: contact.id,
        name: contact.name,
        email: contact.email,
        relation: clean(contact.relation, 120),
        status: contact.status,
        expiresAt: contact.expires_at,
        acceptedAt: nullableDate(contact.accepted_at),
        grants: grantRows.filter((grant) => grant.trusted_contact_id === contact.id).map((grant) => ({
          id: grant.id,
          resourceType: grant.resource_type,
          resourceId: grant.resource_id,
          label: grant.label,
          grantedAt: grant.granted_at,
          revokedAt: nullableDate(grant.revoked_at),
        })),
      })),
      resources: [
        ...rows(documents.data).map((document) => ({
          type: "DOCUMENT",
          id: clean(document.id),
          label: clean(document.title, 160) || "Emergency document",
          detail: [clean(document.category, 160), clean(document.room_name, 160)].filter(Boolean).join(" · "),
        })),
        ...legacy.plans.map((plan) => ({ type: "INSTRUCTION", id: plan.id, label: plan.title, detail: plan.summary })),
        ...legacy.contacts.map((contact) => ({ type: "CONTACT", id: contact.id, label: contact.name, detail: contact.relation })),
        ...legacy.homeInfo.map((entry) => ({ type: "HOME_INFO", id: entry.label, label: entry.label, detail: "Home information" })),
      ],
      received: rows(received.data).flatMap((grant) => {
        const type = resourceType(grant.resource_type);
        const sharing = sharingContact(grant.trusted_emergency_contacts);
        if (!type || !sharing.name) return [];
        return [{
          id: grant.id,
          resourceType: type,
          label: grant.label,
          snapshot: snapshotFor(type, grant.snapshot),
          grantedAt: grant.granted_at,
          contactName: sharing.name,
          contactRelation: sharing.relation,
        }];
      }),
      notifications: rows(notifications.data).map((notice) => ({
        id: notice.id,
        eventType: notice.event_type,
        label: clean(notice.label, 160),
        createdAt: notice.created_at,
      })),
    });
    return { directory, error: null };
  } catch {
    return { directory: null, error: "UNAVAILABLE" };
  }
}

export async function mutateEmergencyAccess(
  supabase: SupabaseClient,
  mutation: EmergencyAccessMutation,
) {
  if (mutation.operation === "CREATE_CONTACT") {
    const token = createEmergencyInviteToken();
    const result = await supabase.rpc("create_trusted_emergency_contact", {
      input_name: mutation.name,
      input_email: mutation.email,
      input_relation: mutation.relation,
      input_public_id: token.publicId,
      input_secret_hash: token.secretHash,
    });
    return result.error || !result.data
      ? { error: "REJECTED" as const, invitePath: null }
      : { error: null, invitePath: emergencyInvitePath(token.publicId, token.secret) };
  }
  const result = mutation.operation === "REVOKE_CONTACT"
    ? await supabase.rpc("revoke_trusted_emergency_contact", { input_contact_id: mutation.contactId })
    : await supabase.rpc("set_emergency_access_grant", {
      input_contact_id: mutation.contactId,
      input_resource_type: mutation.resourceType,
      input_resource_id: mutation.resourceId,
      input_grant: mutation.granted,
    });
  return result.error || !result.data
    ? { error: "REJECTED" as const, invitePath: null }
    : { error: null, invitePath: null };
}
