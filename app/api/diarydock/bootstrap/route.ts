import { NextResponse } from "next/server";

import type {
  DiaryDockAppState,
  DiaryDockBootstrapPayload,
  HouseholdState,
} from "@/lib/diarydock-data";
import type { HouseholdDirectory, HouseholdDirectoryMember, HouseholdRole } from "@/lib/household-sharing";
import type { Reminder, VaultDocument } from "@/lib/mock-data";
import type { ResourceVisibility } from "@/lib/resource-access";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function documentKind(value: unknown): VaultDocument["kind"] {
  return value === "PDF" || value === "Scan" || value === "Note" || value === "Image"
    ? value
    : "Scan";
}

function reviewStatus(value: unknown): VaultDocument["reviewStatus"] {
  return value === "needs-review" || value === "reviewed" ? value : "reviewed";
}

function visibility(value: unknown): ResourceVisibility {
  return value === "HOUSEHOLD" || value === "SELECTED_MEMBERS" ? value : "PRIVATE";
}

function reminderGroup(value: unknown): Reminder["group"] {
  return value === "today" || value === "week" || value === "later" || value === "done"
    ? value
    : "today";
}

function reminderPriority(value: unknown): Reminder["priority"] {
  return value === "high" || value === "normal" || value === "low" ? value : "normal";
}

export async function GET() {
  if (!isSupabaseConfiguredServer()) {
    return NextResponse.json({ error: "Secure sync is not configured." }, { status: 503 });
  }

  const supabase = await getSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Please sign in again to load DiaryDock." }, { status: 401 });
  }

  const userId = authData.user.id;
  const { data: householdId, error: householdError } = await supabase.rpc("ensure_user_household");
  if (householdError || !householdId) {
    return NextResponse.json(
      { error: householdError?.message ?? "Your household could not be loaded." },
      { status: 500 },
    );
  }

  const [
    privateResult,
    sharedResult,
    householdResult,
    membershipsResult,
    invitesResult,
    documentsResult,
    remindersResult,
    legacyPermissionsResult,
    sharedResourcesResult,
    resourcePermissionsResult,
  ] = await Promise.all([
    supabase.from("app_state").select("payload").eq("id", userId).maybeSingle(),
    supabase.from("household_state").select("payload").eq("household_id", householdId).maybeSingle(),
    supabase.from("households").select("name").eq("id", householdId).maybeSingle(),
    supabase
      .from("household_memberships")
      .select("user_id, role, display_name, relation, joined_at")
      .eq("household_id", householdId)
      .eq("status", "active")
      .order("joined_at", { ascending: true }),
    supabase
      .from("household_invites")
      .select("token, email, name, relation, access, created_at, expires_at")
      .eq("household_id", householdId)
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase.from("documents").select("*").order("updated_at", { ascending: false }),
    supabase.from("reminders").select("*").order("updated_at", { ascending: false }),
    supabase
      .from("document_permissions")
      .select("document_id, subject_name")
      .order("created_at", { ascending: true }),
    supabase
      .from("shared_resources")
      .select("id, owner_id, resource_id, visibility")
      .eq("resource_type", "document"),
    supabase
      .from("resource_permissions")
      .select("shared_resource_id, subject_user_id")
      .is("revoked_at", null),
  ]);

  if (documentsResult.error || remindersResult.error || membershipsResult.error) {
    return NextResponse.json(
      {
        error:
          documentsResult.error?.message ??
          remindersResult.error?.message ??
          membershipsResult.error?.message ??
          "DiaryDock data could not be loaded.",
      },
      { status: 500 },
    );
  }

  const members: HouseholdDirectoryMember[] = (membershipsResult.data ?? []).map((row) => ({
    userId: String(row.user_id),
    name: String(row.display_name || "Household member"),
    relation: String(row.relation || "Household member"),
    role: row.role as HouseholdRole,
    joinedAt: String(row.joined_at),
  }));
  const currentMembership = members.find((member) => member.userId === userId);
  const household: HouseholdDirectory | null = currentMembership
    ? {
        householdId: String(householdId),
        householdName: String(householdResult.data?.name ?? "My household"),
        currentUserId: userId,
        role: currentMembership.role,
        members,
        invites: invitesResult.error
          ? []
          : (invitesResult.data ?? []).map((row) => ({
              token: String(row.token),
              email: String(row.email),
              name: String(row.name),
              relation: String(row.relation),
              access: String(row.access),
              createdAt: String(row.created_at),
              expiresAt: String(row.expires_at),
            })),
      }
    : null;

  const legacyPermissionMap = new Map<string, string[]>();
  if (!legacyPermissionsResult.error) {
    (legacyPermissionsResult.data ?? []).forEach((row) => {
      const documentId = String(row.document_id);
      legacyPermissionMap.set(documentId, [
        ...(legacyPermissionMap.get(documentId) ?? []),
        String(row.subject_name),
      ]);
    });
  }

  const sharedResourceMap = new Map<
    string,
    { id: string; ownerId: string; visibility: ResourceVisibility }
  >();
  if (!sharedResourcesResult.error) {
    (sharedResourcesResult.data ?? []).forEach((row) => {
      sharedResourceMap.set(String(row.resource_id), {
        id: String(row.id),
        ownerId: String(row.owner_id),
        visibility: visibility(row.visibility),
      });
    });
  }

  const selectedMemberMap = new Map<string, string[]>();
  if (!resourcePermissionsResult.error) {
    (resourcePermissionsResult.data ?? []).forEach((row) => {
      const resourceId = String(row.shared_resource_id);
      selectedMemberMap.set(resourceId, [
        ...(selectedMemberMap.get(resourceId) ?? []),
        String(row.subject_user_id),
      ]);
    });
  }

  const documents: VaultDocument[] = (documentsResult.data ?? []).map((row) => {
    const documentId = String(row.id);
    const sharedResource = sharedResourceMap.get(documentId);
    return {
      id: documentId,
      title: String(row.title),
      category: String(row.category),
      kind: documentKind(row.kind),
      size: String(row.size_label ?? ""),
      updated: "Just now",
      ownerId: String(row.user_id),
      isOwnedByCurrentUser: String(row.user_id) === userId,
      storageBucket: row.storage_bucket ? String(row.storage_bucket) : undefined,
      storagePath: row.storage_path ? String(row.storage_path) : undefined,
      originalFileName: row.original_file_name ? String(row.original_file_name) : undefined,
      mimeType: row.mime_type ? String(row.mime_type) : undefined,
      roomId: row.room_id ? String(row.room_id) : undefined,
      roomName: row.room_name ? String(row.room_name) : undefined,
      issuer: row.issuer ? String(row.issuer) : undefined,
      dueDate: row.due_date ? String(row.due_date) : undefined,
      extractionSummary: row.extraction_summary ? String(row.extraction_summary) : undefined,
      extractedText: row.extracted_text ? String(row.extracted_text) : undefined,
      actionItems: stringArray(row.action_items),
      confidence: typeof row.confidence === "number" ? row.confidence : undefined,
      reviewStatus: reviewStatus(row.review_status),
      reviewReasons: stringArray(row.review_reasons),
      reviewedAt: row.reviewed_at ? String(row.reviewed_at) : undefined,
      emergencyVisible: Boolean(row.emergency_visible),
      visibility: sharedResource?.visibility ?? "PRIVATE",
      sharedWithUserIds: sharedResource
        ? selectedMemberMap.get(sharedResource.id) ?? []
        : [],
      sharedWith: legacyPermissionMap.get(documentId) ?? stringArray(row.shared_with),
    };
  });

  const reminders: Reminder[] = (remindersResult.data ?? []).map((row) => ({
    id: String(row.id),
    title: String(row.title),
    note: row.note ? String(row.note) : undefined,
    roomId: row.room_id ? String(row.room_id) : undefined,
    roomName: row.room_name ? String(row.room_name) : undefined,
    group: reminderGroup(row.reminder_group),
    timeLabel: String(row.time_label),
    priority: reminderPriority(row.priority),
    repeat: row.repeat ? String(row.repeat) : undefined,
    documentId: row.document_id ? String(row.document_id) : undefined,
    documentTitle: row.document_title ? String(row.document_title) : undefined,
  }));

  const payload: DiaryDockBootstrapPayload = {
    userId,
    privateState: !privateResult.error && privateResult.data?.payload
      ? privateResult.data.payload as DiaryDockAppState
      : null,
    householdState: !sharedResult.error && sharedResult.data?.payload
      ? sharedResult.data.payload as Partial<HouseholdState>
      : null,
    household,
    documents,
    reminders,
  };

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}
