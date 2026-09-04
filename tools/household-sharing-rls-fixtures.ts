// @ts-nocheck
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

export const RLS_BUCKET = "diarydock-documents";
export const RLS_PURPOSE = "DiaryDock household sharing RLS test";
export type RlsClient = ReturnType<typeof createClient>;
export type RlsActor = { label: string; email: string; password: string; userId: string; client: RlsClient };
export type RlsDocument = { id: string; title: string; storagePath: string };
export type RlsCheck = { name: string; passed: boolean; detail?: string };

export function must(value: string | undefined | null, label: string) {
  if (!value) throw new Error(`${label} is missing.`);
  return value;
}

export function assertNo(error: { message: string } | null, step: string) {
  if (error) throw new Error(`${step}: ${error.message}`);
}

export function parseEnv(filePath: string) {
  const values: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return values;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[key] = value;
  }
  return values;
}

export function readLinkedProjectRef() {
  const path = "supabase/.temp/project-ref";
  return fs.existsSync(path) ? fs.readFileSync(path, "utf8").trim() : undefined;
}

export function rlsClient(url: string, key: string) {
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function createActor(admin: RlsClient, url: string, anonKey: string, runId: string, label: string): Promise<RlsActor> {
  const suffix = `${runId}-${label}`;
  const email = `hello+household-rls-${suffix}@diarydock.com`;
  const password = `Rls-${randomUUID()}!Aa1`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { purpose: RLS_PURPOSE, test_run_id: runId, test_actor: label } });
  assertNo(created.error, `create ${label} auth user`);
  const userId = must(created.data.user?.id, `${label} user id`);
  const client = rlsClient(url, anonKey);
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) {
    await admin.auth.admin.deleteUser(userId).catch(() => undefined);
    throw new Error(`sign in ${label}: ${signedIn.error.message}`);
  }
  return { label, email, password, userId, client };
}

export async function joinHousehold(owner: RlsActor, member: RlsActor) {
  const invite = await owner.client.rpc("create_household_role_invite", { invite_email: member.email, invite_name: `RLS ${member.label}`, invite_relation: "Automated security test", invite_role: "viewer" });
  assertNo(invite.error, `invite ${member.label}`);
  const token = must(invite.data, `${member.label} invite token`);
  const accepted = await member.client.rpc("accept_household_invite", { invite_token: token });
  assertNo(accepted.error, `accept ${member.label} invite`);
}

export async function createDocument(admin: RlsClient, owner: RlsActor, label: string, trackedPaths: string[]) {
  const id = randomUUID();
  const storagePath = `${owner.userId}/${id}/${label}.pdf`;
  const title = `RLS ${label} ${id.slice(0, 8)}`;
  const pdf = Buffer.from(`%PDF-1.1\n% DiaryDock RLS ${label}\n%%EOF\n`, "utf8");
  const uploaded = await admin.storage.from(RLS_BUCKET).upload(storagePath, pdf, { contentType: "application/pdf", upsert: false });
  assertNo(uploaded.error, `upload ${label} file`);
  trackedPaths.push(storagePath);
  const inserted = await owner.client.from("documents").insert({ id, user_id: owner.userId, title, category: "Test", kind: "PDF", size_label: `${pdf.length} B`, room_id: "office", room_name: "Office", storage_bucket: RLS_BUCKET, storage_path: storagePath, original_file_name: `${label}.pdf`, mime_type: "application/pdf", review_status: "reviewed" });
  assertNo(inserted.error, `insert ${label} document`);
  return { id, title, storagePath } satisfies RlsDocument;
}

export async function setSharing(owner: RlsActor, document: RlsDocument, visibility: string, selected: string[] = []) {
  const result = await owner.client.rpc("set_document_sharing", { target_document_id: document.id, new_visibility: visibility, selected_user_ids: selected });
  assertNo(result.error, `set ${document.id} to ${visibility}`);
}

export function addCheck(checks: RlsCheck[], name: string, passed: boolean, detail?: string) {
  checks.push({ name, passed, ...(detail ? { detail } : {}) });
}

export async function checkDocumentAccess(checks: RlsCheck[], actor: RlsActor, document: RlsDocument, expected: boolean, context: string, checkFile = true) {
  const row = await actor.client.from("documents").select("id,title,user_id").eq("id", document.id).maybeSingle();
  const canReadRow = !row.error && row.data?.id === document.id;
  addCheck(checks, `${context}: ${actor.label} ${expected ? "can" : "cannot"} read the database row`, canReadRow === expected, row.error?.message);
  if (!checkFile) return;
  const file = await actor.client.storage.from(RLS_BUCKET).download(document.storagePath);
  addCheck(checks, `${context}: ${actor.label} ${expected ? "can" : "cannot"} read the stored file`, (!file.error && Boolean(file.data)) === expected, file.error?.message);
}

export async function cleanupRlsRun(admin: RlsClient, userIds: string[], documentIds: string[], storagePaths: string[]) {
  const warnings: string[] = [];
  const capture = async (label: string, operation: PromiseLike<{ error: { message: string } | null }>) => { try { const result = await operation; if (result.error) warnings.push(`${label}: ${result.error.message}`); } catch (error) { warnings.push(`${label}: ${error instanceof Error ? error.message : String(error)}`); } };
  if (storagePaths.length) await capture("remove test files", admin.storage.from(RLS_BUCKET).remove(storagePaths));
  if (documentIds.length) await capture("remove test documents", admin.from("documents").delete().in("id", documentIds));
  if (userIds.length) {
    await capture("remove test app state", admin.from("app_state").delete().in("id", userIds));
    await capture("remove test audit events", admin.from("audit_events").delete().in("user_id", userIds));
    await capture("remove test households", admin.from("households").delete().in("owner_id", userIds));
  }
  for (const userId of [...userIds].reverse()) {
    try {
      const lookup = await admin.auth.admin.getUserById(userId);
      if (lookup.data.user?.user_metadata?.purpose !== RLS_PURPOSE) { warnings.push(`refused to delete unmarked auth user ${userId}`); continue; }
      const deleted = await admin.auth.admin.deleteUser(userId);
      if (deleted.error) warnings.push(`delete auth user ${userId}: ${deleted.error.message}`);
    } catch (error) { warnings.push(`delete auth user ${userId}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  return warnings;
}
