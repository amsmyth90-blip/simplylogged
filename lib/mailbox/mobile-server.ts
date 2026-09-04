import "server-only";

import {
  MAILBOX_SCHEMA_VERSION,
  parseMailboxSnapshot,
  type MailboxItem,
  type MailboxMutation,
} from "@diarydock/mailbox";
import type { SupabaseClient } from "@supabase/supabase-js";

type InboxRow = {
  id: string; title: string; source_label: string | null; item_kind: string;
  suggested_room: string | null; route_status: string; document_id: string | null;
  created_at: string; updated_at: string;
};

function toItem(row: InboxRow): MailboxItem {
  const kinds = new Set(["Letter", "Form", "Bill", "Statement"]);
  const statuses = new Set(["new", "vault", "reminder", "room", "ignored"]);
  const title = row.title.trim().slice(0, 240) || "Incoming item";
  const documentId = row.document_id && row.document_id.length <= 180 ? row.document_id : null;
  const kind = kinds.has(row.item_kind) ? row.item_kind as MailboxItem["kind"] : "Letter";
  const routeStatus = statuses.has(row.route_status)
    ? row.route_status as MailboxItem["routeStatus"] : "new";
  return {
    id: row.id,
    title,
    source: (row.source_label ?? "").trim().slice(0, 240),
    kind,
    suggestedRoom: (row.suggested_room || "Office").trim().slice(0, 80) || "Office",
    routeStatus,
    documentId,
    receivedAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadMailboxSnapshot(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.from("life_inbox_items")
    .select("id,title,source_label,item_kind,suggested_room,route_status,document_id,created_at,updated_at")
    .eq("user_id", userId).order("updated_at", { ascending: false }).limit(300);
  if (error) return { error: "UNAVAILABLE" as const, snapshot: null };
  try {
    const items = ((data ?? []) as InboxRow[]).map(toItem);
    return { error: null, snapshot: parseMailboxSnapshot({
      schemaVersion: MAILBOX_SCHEMA_VERSION,
      revision: items[0]?.updatedAt ?? null,
      items,
    }) };
  } catch {
    return { error: "UNAVAILABLE" as const, snapshot: null };
  }
}

export async function applyMailboxMutation(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  userId: string,
  mutation: MailboxMutation,
) {
  const { data, error } = await admin.rpc("apply_mobile_mailbox_action", {
    input_action: mutation.action,
    input_expected_revision: mutation.itemRevision,
    input_item_id: mutation.itemId,
    input_user_id: userId,
  });
  if (error) return { status: "ERROR" as const, snapshot: null };
  const status = typeof data === "string" ? data : "ERROR";
  const latest = await loadMailboxSnapshot(supabase, userId);
  if (!latest.snapshot) return { status: "ERROR" as const, snapshot: null };
  return { status: status as "OK" | "CONFLICT" | "NOT_FOUND" | "INVALID_REFERENCE" | "INVALID",
    snapshot: latest.snapshot };
}
