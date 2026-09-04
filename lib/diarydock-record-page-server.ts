import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  decodeDiaryDockRecordCursor,
  encodeDiaryDockRecordCursor,
  type DiaryDockRecordCursor,
} from "./diarydock-record-cursor.ts";
import type { DiaryDockRecordKind, DiaryDockRecordPage } from "./diarydock-record-page.ts";
import {
  projectDocuments,
  projectReminders,
  visibility,
  type DiaryDockRecordRow,
} from "./diarydock-record-projection.ts";

const pageSize = (kind: DiaryDockRecordKind) => kind === "documents" ? 25 : 200;
const documentColumns = "id,user_id,title,category,kind,size_label,room_id,room_name,issuer,due_date,storage_bucket,storage_path,original_file_name,mime_type,extraction_summary,extracted_text,action_items,confidence,review_status,review_reasons,reviewed_at,emergency_visible,shared_with,created_at";
const reminderColumns = "id,title,note,room_id,room_name,reminder_group,time_label,priority,repeat,document_id,document_title,assigned_to,due_at,source_due_at,origin,reminder_type,source_resource_type,source_resource_id,source_date_key,rule_id,rule_version,dedupe_key,schedule_offset_days,time_zone,created_at";

async function queryRows(
  supabase: SupabaseClient,
  kind: DiaryDockRecordKind,
  cursor: DiaryDockRecordCursor | null,
) {
  const table = kind;
  const columns = kind === "documents" ? documentColumns : reminderColumns;
  const limit = pageSize(kind) + 1;
  const query = () => supabase.from(table).select(columns as "*");
  if (!cursor) {
    const result = await query().order("created_at", { ascending: false })
      .order("id", { ascending: false }).limit(limit);
    return { data: result.data as unknown as DiaryDockRecordRow[] | null, error: result.error };
  }
  const [ties, older] = await Promise.all([
    query().eq("created_at", cursor.createdAt).lt("id", cursor.id)
      .order("id", { ascending: false }).limit(limit),
    query().lt("created_at", cursor.createdAt)
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .limit(limit),
  ]);
  return {
    data: ties.error || older.error ? null
      : [...(ties.data ?? []), ...(older.data ?? [])]
        .map((row) => row as unknown as DiaryDockRecordRow)
        .slice(0, limit),
    error: ties.error ?? older.error,
  };
}

async function documentAccess(
  supabase: SupabaseClient,
  ids: string[],
) {
  const legacy = new Map<string, string[]>();
  const resources = new Map<string, {
    id: string; ownerId: string; visibility: ReturnType<typeof visibility>;
  }>();
  const selected = new Map<string, string[]>();
  if (!ids.length) return { legacy, resources, selected, error: null };
  const [legacyResult, resourceResult] = await Promise.all([
    supabase.from("document_permissions").select("document_id,subject_name")
      .in("document_id", ids).order("created_at", { ascending: true }),
    supabase.from("shared_resources").select("id,owner_id,resource_id,visibility")
      .eq("resource_type", "document").in("resource_id", ids),
  ]);
  if (legacyResult.error || resourceResult.error) {
    return { legacy, resources, selected, error: legacyResult.error ?? resourceResult.error };
  }
  for (const row of legacyResult.data ?? []) {
    const id = String(row.document_id);
    legacy.set(id, [...(legacy.get(id) ?? []), String(row.subject_name)]);
  }
  for (const row of resourceResult.data ?? []) {
    resources.set(String(row.resource_id), {
      id: String(row.id), ownerId: String(row.owner_id), visibility: visibility(row.visibility),
    });
  }
  const resourceIds = [...resources.values()].map((resource) => resource.id);
  if (!resourceIds.length) return { legacy, resources, selected, error: null };
  const permissionResult = await supabase.from("resource_permissions")
    .select("shared_resource_id,subject_user_id")
    .in("shared_resource_id", resourceIds).is("revoked_at", null);
  if (permissionResult.error) return { legacy, resources, selected, error: permissionResult.error };
  for (const row of permissionResult.data ?? []) {
    const id = String(row.shared_resource_id);
    selected.set(id, [...(selected.get(id) ?? []), String(row.subject_user_id)]);
  }
  return { legacy, resources, selected, error: null };
}

export async function loadDiaryDockRecordPage(
  supabase: SupabaseClient,
  userId: string,
  kind: DiaryDockRecordKind,
  encodedCursor: string | null,
): Promise<{ page: DiaryDockRecordPage | null; error: "INVALID_CURSOR" | "DATABASE" | null }> {
  let cursor;
  try { cursor = decodeDiaryDockRecordCursor(kind, encodedCursor); }
  catch { return { page: null, error: "INVALID_CURSOR" }; }
  const result = await queryRows(supabase, kind, cursor);
  if (result.error || !result.data) return { page: null, error: "DATABASE" };
  const limit = pageSize(kind);
  const rows = result.data.slice(0, limit);
  if (rows.some((row) => !row.id || !row.created_at
    || !Number.isFinite(Date.parse(row.created_at)))) {
    return { page: null, error: "DATABASE" };
  }
  const nextCursor = result.data.length > limit && rows.length
    ? encodeDiaryDockRecordCursor(kind, {
      createdAt: rows.at(-1)!.created_at, id: rows.at(-1)!.id,
    }) : null;
  if (kind === "reminders") return {
    error: null,
    page: { kind, documents: [], reminders: projectReminders(rows), nextCursor },
  };
  const access = await documentAccess(supabase, rows.map((row) => row.id));
  if (access.error) return { page: null, error: "DATABASE" };
  return {
    error: null,
    page: { kind, documents: projectDocuments(rows, userId, access), reminders: [], nextCursor },
  };
}
