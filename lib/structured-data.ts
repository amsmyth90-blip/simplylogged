"use client";

import type { Reminder, VaultDocument } from "@/lib/mock-data";
import type { HouseholdMember, Invite } from "@/lib/diarydock-data";
import type { ResourceVisibility } from "@/lib/resource-access";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function arrayOrEmpty<T>(value: T[] | undefined) {
  return value ?? [];
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asDocumentKind(value: unknown): VaultDocument["kind"] {
  return value === "PDF" || value === "Scan" || value === "Note" || value === "Image" ? value : "Scan";
}

function asReviewStatus(value: unknown): VaultDocument["reviewStatus"] {
  return value === "needs-review" || value === "reviewed" ? value : "reviewed";
}

function asResourceVisibility(value: unknown): ResourceVisibility {
  return value === "HOUSEHOLD" || value === "SELECTED_MEMBERS" ? value : "PRIVATE";
}

function asReminderGroup(value: unknown): Reminder["group"] {
  return value === "today" || value === "week" || value === "later" || value === "done" ? value : "today";
}

function asReminderPriority(value: unknown): Reminder["priority"] {
  return value === "high" || value === "normal" || value === "low" ? value : "normal";
}

function asAccessTone(value: unknown): HouseholdMember["accessTone"] {
  return value === "full" || value === "shared" || value === "limited" ? value : "limited";
}
function isMissingOptionalTableError(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? "";
  return error.code === "42P01" || message.includes("could not find the table") || message.includes("schema cache");
}
async function getAuthenticatedUserId() {
  const client = getSupabaseBrowserClient();
  if (!client) {
    return null;
  }

  const {
    data: { user },
    error
  } = await client.auth.getUser();

  if (error || !user) {
    throw new Error("Please sign in again before saving.");
  }

  return user.id;
}

export async function upsertStructuredDocument(document: VaultDocument) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    return;
  }

  const userId = await getAuthenticatedUserId();
  const documentRow = {
    id: document.id,
    user_id: userId,
    title: document.title,
    category: document.category,
    kind: document.kind,
    size_label: document.size,
    room_id: document.roomId ?? null,
    room_name: document.roomName ?? null,
    issuer: document.issuer ?? null,
    due_date: document.dueDate ?? null,
    storage_bucket: document.storageBucket ?? null,
    storage_path: document.storagePath ?? null,
    original_file_name: document.originalFileName ?? null,
    mime_type: document.mimeType ?? null,
    extraction_summary: document.extractionSummary ?? null,
    extracted_text: document.extractedText ?? null,
    action_items: arrayOrEmpty(document.actionItems),
    confidence: document.confidence ?? null,
    review_status: document.reviewStatus ?? "reviewed",
    review_reasons: arrayOrEmpty(document.reviewReasons),
    reviewed_at: document.reviewedAt ?? null,
    emergency_visible: Boolean(document.emergencyVisible),
    // Display-name permissions are legacy metadata, never an authorization source.
    // New grants are written atomically through set_document_sharing.
    shared_with: [] as string[]
  };

  const { error } = await client.from("documents").upsert(
    documentRow,
    { onConflict: "id" }
  );

  if (error) {
    if (error.message.includes("emergency_visible")) {
      const { emergency_visible, ...fallbackRow } = documentRow;
      void emergency_visible;
      const { error: fallbackError } = await client.from("documents").upsert(fallbackRow, { onConflict: "id" });

      if (fallbackError) {
        throw new Error(fallbackError.message);
      }
    } else {
      throw new Error(error.message);
    }
  }
}

export async function deleteStructuredDocument(document: VaultDocument) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    return;
  }

  const userId = await getAuthenticatedUserId();

  if (document.storageBucket && document.storagePath) {
    await client.storage.from(document.storageBucket).remove([document.storagePath]);
  }

  const { error: inboxDeleteError } = await client
    .from("life_inbox_items")
    .delete()
    .eq("document_id", document.id)
    .eq("user_id", userId);

  if (inboxDeleteError && !isMissingOptionalTableError(inboxDeleteError)) {
    throw new Error(inboxDeleteError.message);
  }

  const { error: permissionDeleteError } = await client
    .from("document_permissions")
    .delete()
    .eq("document_id", document.id);

  if (permissionDeleteError && !isMissingOptionalTableError(permissionDeleteError)) {
    throw new Error(permissionDeleteError.message);
  }

  const { error } = await client
    .from("documents")
    .delete()
    .eq("id", document.id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function upsertDocumentPermissions(documentId: string, sharedWith: string[]) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    return;
  }

  await getAuthenticatedUserId();
  const cleanNames = Array.from(new Set(sharedWith.map((name) => name.trim()).filter(Boolean)));
  const { error: deleteError } = await client.from("document_permissions").delete().eq("document_id", documentId);

  if (deleteError) {
    if (isMissingOptionalTableError(deleteError)) {
      return;
    }

    throw new Error(deleteError.message);
  }

  if (!cleanNames.length) {
    return;
  }

  const { error } = await client.from("document_permissions").insert(
    cleanNames.map((name) => ({
      document_id: documentId,
      subject_name: name,
      access_level: "view"
    }))
  );

  if (error) {
    if (isMissingOptionalTableError(error)) {
      return;
    }

    throw new Error(error.message);
  }
}

export async function upsertStructuredReminder(reminder: Reminder) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    return;
  }

  const userId = await getAuthenticatedUserId();
  const { error } = await client.from("reminders").upsert(
    {
      id: reminder.id,
      user_id: userId,
      title: reminder.title,
      note: reminder.note ?? null,
      room_id: reminder.roomId ?? null,
      room_name: reminder.roomName ?? null,
      reminder_group: reminder.group,
      time_label: reminder.timeLabel,
      priority: reminder.priority,
      repeat: reminder.repeat ?? null,
      document_id: reminder.documentId ?? null,
      document_title: reminder.documentTitle ?? null,
      due_at: reminder.dueAt ?? null,
      source_due_at: reminder.sourceDueAt ?? null,
      origin: reminder.origin ?? "USER_CREATED",
      reminder_type: reminder.reminderType ?? "custom",
      source_resource_type: reminder.sourceResourceType ?? null,
      source_resource_id: reminder.sourceResourceId ?? null,
      source_date_key: reminder.sourceDateKey ?? null,
      rule_id: reminder.ruleId ?? null,
      rule_version: reminder.ruleVersion ?? null,
      dedupe_key: reminder.dedupeKey ?? null,
      schedule_offset_days: reminder.scheduleOffsetDays ?? null,
      time_zone: reminder.timeZone ?? "Europe/London"
    },
    { onConflict: "id" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteStructuredReminder(reminderId: string) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    return;
  }

  const userId = await getAuthenticatedUserId();
  const { error } = await client
    .from("reminders")
    .delete()
    .eq("id", reminderId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function upsertStructuredHouseholdMember(member: HouseholdMember) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    return;
  }

  const userId = await getAuthenticatedUserId();
  const { error } = await client.from("household_members").upsert(
    {
      id: member.id,
      user_id: userId,
      name: member.name,
      role: member.role,
      access: member.access,
      access_tone: member.accessTone,
      note: member.note,
      initials: member.initials,
      manages: arrayOrEmpty(member.manages),
      last_active: member.lastActive
    },
    { onConflict: "id" }
  );

  if (error) {
    if (isMissingOptionalTableError(error)) {
      return;
    }

    throw new Error(error.message);
  }
}

export async function upsertStructuredFamilyInvite(invite: Invite) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    return;
  }

  const userId = await getAuthenticatedUserId();
  const { error } = await client.from("family_invites").upsert(
      {
        id: invite.id,
        user_id: userId,
        email: invite.email ?? null,
        name: invite.name,
      relation: invite.relation,
      access: invite.access,
      sent_ago: invite.sentAgo,
      initials: invite.initials,
      status: invite.status
    },
    { onConflict: "id" }
  );

  if (error) {
    if (isMissingOptionalTableError(error)) {
      return;
    }

    throw new Error(error.message);
  }
}

export async function deleteStructuredFamilyInvite(inviteId: string) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    return;
  }

  const { error } = await client.from("family_invites").delete().eq("id", inviteId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function loadStructuredDocumentsAndReminders() {
  const client = getSupabaseBrowserClient();
  if (!client) {
    return {
      documents: [] as VaultDocument[],
      reminders: [] as Reminder[],
      householdMembers: [] as HouseholdMember[],
      familyInvites: [] as Invite[]
    };
  }

  const currentUserId = await getAuthenticatedUserId();

  const [
    documentsResult,
    remindersResult,
    permissionsResult,
    membersResult,
    invitesResult,
    sharedResourcesResult,
    resourcePermissionsResult
  ] = await Promise.all([
    client.from("documents").select("*").order("updated_at", { ascending: false }),
    client.from("reminders").select("*").order("updated_at", { ascending: false }),
    client.from("document_permissions").select("document_id, subject_name").order("created_at", { ascending: true }),
    client.from("household_members").select("*").order("created_at", { ascending: true }),
    client.from("family_invites").select("*").order("created_at", { ascending: true }),
    client
      .from("shared_resources")
      .select("id, owner_id, resource_id, visibility")
      .eq("resource_type", "document"),
    client
      .from("resource_permissions")
      .select("shared_resource_id, subject_user_id")
      .is("revoked_at", null)
  ]);

  if (documentsResult.error || remindersResult.error) {
    return {
      documents: [] as VaultDocument[],
      reminders: [] as Reminder[],
      householdMembers: [] as HouseholdMember[],
      familyInvites: [] as Invite[]
    };
  }

  const permissionMap = new Map<string, string[]>();
  if (!permissionsResult.error) {
    (permissionsResult.data ?? []).forEach((row) => {
      const current = permissionMap.get(row.document_id) ?? [];
      permissionMap.set(row.document_id, [...current, row.subject_name]);
    });
  }

  const sharedResourceMap = new Map<string, { id: string; ownerId: string; visibility: ResourceVisibility }>();
  if (!sharedResourcesResult.error) {
    (sharedResourcesResult.data ?? []).forEach((row) => {
      sharedResourceMap.set(String(row.resource_id), {
        id: String(row.id),
        ownerId: String(row.owner_id),
        visibility: asResourceVisibility(row.visibility)
      });
    });
  }

  const selectedMemberMap = new Map<string, string[]>();
  if (!resourcePermissionsResult.error) {
    (resourcePermissionsResult.data ?? []).forEach((row) => {
      const resourceId = String(row.shared_resource_id);
      const current = selectedMemberMap.get(resourceId) ?? [];
      selectedMemberMap.set(resourceId, [...current, String(row.subject_user_id)]);
    });
  }

  const documents: VaultDocument[] = (documentsResult.data ?? []).map((row) => {
    const sharedResource = sharedResourceMap.get(String(row.id));
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      kind: asDocumentKind(row.kind),
      size: row.size_label,
      updated: "Just now",
      ownerId: String(row.user_id),
      isOwnedByCurrentUser: String(row.user_id) === currentUserId,
      storageBucket: row.storage_bucket ?? undefined,
      storagePath: row.storage_path ?? undefined,
      originalFileName: row.original_file_name ?? undefined,
      mimeType: row.mime_type ?? undefined,
      roomId: row.room_id ?? undefined,
      roomName: row.room_name ?? undefined,
      issuer: row.issuer ?? undefined,
      dueDate: row.due_date ?? undefined,
      extractionSummary: row.extraction_summary ?? undefined,
      extractedText: row.extracted_text ?? undefined,
      actionItems: asStringArray(row.action_items),
      confidence: typeof row.confidence === "number" ? row.confidence : undefined,
      reviewStatus: asReviewStatus(row.review_status),
      reviewReasons: asStringArray(row.review_reasons),
      reviewedAt: row.reviewed_at ?? undefined,
      emergencyVisible: Boolean(row.emergency_visible),
      visibility: sharedResource?.visibility ?? "PRIVATE",
      sharedWithUserIds: sharedResource ? selectedMemberMap.get(sharedResource.id) ?? [] : [],
      sharedWith: permissionMap.get(row.id) ?? asStringArray(row.shared_with)
    };
  });

  const reminders: Reminder[] = (remindersResult.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    note: row.note ?? undefined,
    roomId: row.room_id ?? undefined,
    roomName: row.room_name ?? undefined,
    group: asReminderGroup(row.reminder_group),
    timeLabel: row.time_label,
    priority: asReminderPriority(row.priority),
    repeat: row.repeat ?? undefined,
    documentId: row.document_id ?? undefined,
    documentTitle: row.document_title ?? undefined,
    dueAt: row.due_at ?? undefined,
    sourceDueAt: row.source_due_at ?? undefined,
    origin: row.origin === "SYSTEM_GENERATED" ? "SYSTEM_GENERATED" : "USER_CREATED",
    reminderType: row.reminder_type ?? undefined,
    sourceResourceType: row.source_resource_type ?? undefined,
    sourceResourceId: row.source_resource_id ?? undefined,
    sourceDateKey: row.source_date_key ?? undefined,
    ruleId: row.rule_id ?? undefined,
    ruleVersion: typeof row.rule_version === "number" ? row.rule_version : undefined,
    dedupeKey: row.dedupe_key ?? undefined,
    scheduleOffsetDays: typeof row.schedule_offset_days === "number" ? row.schedule_offset_days : undefined,
    timeZone: row.time_zone ?? undefined
  }));

  const householdMembers: HouseholdMember[] = membersResult.error
    ? []
    : (membersResult.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        role: row.role,
        access: row.access,
        accessTone: asAccessTone(row.access_tone),
        note: row.note,
        initials: row.initials,
        manages: asStringArray(row.manages),
        lastActive: row.last_active
      }));

  const familyInvites: Invite[] = invitesResult.error
    ? []
    : (invitesResult.data ?? []).map((row) => ({
        id: row.id,
        email: row.email ?? undefined,
        name: row.name,
        relation: row.relation,
        access: row.access,
        sentAgo: row.sent_ago,
        initials: row.initials,
        status: "pending"
      }));

  return { documents, reminders, householdMembers, familyInvites };
}

export async function backfillStructuredDocumentsAndReminders(
  documents: VaultDocument[],
  reminders: Reminder[],
  householdMembers: HouseholdMember[] = [],
  familyInvites: Invite[] = []
) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    return;
  }

  await Promise.all([
    ...documents.map((document) => upsertStructuredDocument(document)),
    ...reminders.map((reminder) => upsertStructuredReminder(reminder)),
    ...householdMembers.map((member) => upsertStructuredHouseholdMember(member)),
    ...familyInvites.map((invite) => upsertStructuredFamilyInvite(invite))
  ]);
}
