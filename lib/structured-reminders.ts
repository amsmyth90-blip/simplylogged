"use client";

import { parseSyncPushResponse, type SyncRecord } from "@diarydock/contracts";

import type { Reminder } from "@/lib/mock-data";
import { readBoundedJsonResponse } from "@/lib/http/bounded-json-response";
import { getAuthenticatedUserId } from "@/lib/structured-data-client";
import {
  createReminderSyncRequest,
  parseReminderSyncRow,
  type ReminderSyncRow,
} from "@/lib/structured-reminder-sync";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const responseLimit = 64 * 1024;
const syncColumns = [
  "record_id", "entity_type", "scope_kind", "scope_id", "revision",
  "schema_version", "payload", "updated_at", "deleted_at",
].join(",");

async function authenticatedAccessToken() {
  const client = getSupabaseBrowserClient();
  if (!client) return null;
  await getAuthenticatedUserId();
  const { data, error } = await client.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("Please sign in again before saving.");
  }
  return { client, token: data.session.access_token };
}

async function currentRecord(
  client: NonNullable<ReturnType<typeof getSupabaseBrowserClient>>,
  reminderId: string,
) {
  const result = await client.from("sync_records")
    .select(syncColumns)
    .eq("entity_type", "reminder")
    .eq("source_id", reminderId)
    .maybeSingle<ReminderSyncRow>();
  if (result.error) throw new Error("DiaryDock could not read the reminder version.");
  return result.data ? parseReminderSyncRow(result.data) : null;
}

async function pushReminder(
  token: string,
  reminder: Reminder,
  operation: "DELETE" | "UPSERT",
  current: SyncRecord | null,
) {
  const request = createReminderSyncRequest({ current, operation, reminder });
  const response = await fetch("/api/sync/push", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const value = await readBoundedJsonResponse(response, responseLimit);
  if (!response.ok) throw new Error("DiaryDock could not save the reminder.");
  const result = parseSyncPushResponse(value);
  const mutation = request.mutations[0]!;
  if (result.batchId !== request.batchId || result.results.length !== 1
    || result.results[0]!.idempotencyKey !== mutation.idempotencyKey) {
    throw new Error("DiaryDock received an invalid reminder response.");
  }
  return result.results[0]!;
}

async function mutateReminder(reminder: Reminder, operation: "DELETE" | "UPSERT") {
  const auth = await authenticatedAccessToken();
  if (!auth) return;
  let current = await currentRecord(auth.client, reminder.id);
  if (operation === "DELETE" && !current) return;
  let result = await pushReminder(auth.token, reminder, operation, current);
  if (result.status === "CONFLICT") {
    current = await currentRecord(auth.client, reminder.id);
    result = await pushReminder(auth.token, reminder, operation, current);
  }
  if (result.status !== "APPLIED") {
    throw new Error("DiaryDock could not safely save the reminder.");
  }
}

export async function upsertStructuredReminder(reminder: Reminder) {
  await mutateReminder(reminder, "UPSERT");
}

export async function deleteStructuredReminder(reminderId: string) {
  const placeholder: Reminder = {
    group: "today", id: reminderId, priority: "normal",
    timeLabel: "Today", title: "Deleted reminder",
  };
  await mutateReminder(placeholder, "DELETE");
}
