// @ts-nocheck
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { processAccountDeletion } from "../lib/account-deletion";

type EnvMap = Record<string, string>;

function parseEnv(filePath: string): EnvMap {
  const out: EnvMap = {};
  if (!fs.existsSync(filePath)) return out;

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }

  return out;
}

function must(value: string | undefined, label: string) {
  if (!value) throw new Error(`${label} is missing.`);
  return value;
}

function assertNo(error: { message: string } | null, step: string) {
  if (error) throw new Error(`${step}: ${error.message}`);
}

function getProjectRef() {
  const refPath = "supabase/.temp/project-ref";
  return fs.existsSync(refPath) ? fs.readFileSync(refPath, "utf8").trim() : "";
}

function getServiceRoleKey() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  }

  const projectRef = must(process.env.SUPABASE_PROJECT_REF || getProjectRef(), "Supabase project ref");
  const output = process.platform === "win32"
    ? execFileSync(
      "cmd.exe",
      ["/d", "/s", "/c", `npx supabase projects api-keys --project-ref ${projectRef} --reveal --output json`],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    )
    : execFileSync(
      "npx",
      ["supabase", "projects", "api-keys", "--project-ref", projectRef, "--reveal", "--output", "json"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  const keys = JSON.parse(output) as Array<{ id?: string; api_key?: string; secret_jwt_template?: { role?: string } }>;
  const serviceKey = keys.find((key) => key.id === "service_role")?.api_key ??
    keys.find((key) => key.secret_jwt_template?.role === "service_role")?.api_key;
  return must(serviceKey, "Supabase service role key");
}

async function countRows(client: ReturnType<typeof createClient>, table: string, column: string, value: string) {
  const { count, error } = await client.from(table).select("*", { count: "exact", head: true }).eq(column, value);
  assertNo(error, `count ${table}`);
  return count ?? 0;
}

async function removeStorageTree(client: ReturnType<typeof createClient>, bucket: string, prefix: string) {
  const { data } = await client.storage.from(bucket).list(prefix, { limit: 1000 });
  const paths = (data ?? []).map((item) => `${prefix}/${item.name}`);
  if (paths.length) await client.storage.from(bucket).remove(paths);
}

async function cleanup(admin: ReturnType<typeof createClient>, userId: string) {
  if (!userId) return;
  await removeStorageTree(admin, "diarydock-documents", userId).catch(() => undefined);
  await admin.from("reminders").delete().eq("user_id", userId).then(() => undefined, () => undefined);
  await admin.from("documents").delete().eq("user_id", userId).then(() => undefined, () => undefined);
  await admin.from("app_state").delete().eq("id", userId).then(() => undefined, () => undefined);
  await admin.from("account_deletion_requests").delete().eq("user_id", userId).then(() => undefined, () => undefined);
  await admin.auth.admin.deleteUser(userId).catch(() => undefined);
}

async function main() {
  const local = parseEnv(".env.local");
  const url = must(local.NEXT_PUBLIC_SUPABASE_URL, "Supabase URL");
  const anon = must(
    local.NEXT_PUBLIC_SUPABASE_ANON_KEY || local.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    "Supabase anon/publishable key",
  );
  const service = getServiceRoleKey();

  const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
  const userClient = createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } });

  if (process.env.DIARYDOCK_CLEANUP_USER_ID) {
    const cleanupUserId = process.env.DIARYDOCK_CLEANUP_USER_ID;
    const lookup = await admin.auth.admin.getUserById(cleanupUserId);
    const purpose = lookup.data?.user?.user_metadata?.purpose;
    if (purpose !== "DiaryDock account deletion flow test") {
      throw new Error("Refusing cleanup because the target is not marked as a DiaryDock account deletion flow test user.");
    }
    await cleanup(admin, cleanupUserId);
    console.log(JSON.stringify({ ok: true, cleanedUpUserId: cleanupUserId }, null, 2));
    return;
  }

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `hello+account-deletion-flow-${suffix}@diarydock.com`;
  const password = `DeleteTest-${suffix}!Aa1`;
  let userId = "";
  let requestId = "";
  const docId = randomUUID();
  const reminderId = randomUUID();

  try {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { purpose: "DiaryDock account deletion flow test" },
    });
    assertNo(created.error, "create dummy auth user");
    userId = must(created.data.user?.id, "Dummy user id");

    const signedIn = await userClient.auth.signInWithPassword({ email, password });
    assertNo(signedIn.error, "dummy sign in before deletion");

    const appState = await admin.from("app_state").upsert({
      id: userId,
      payload: { test: "account-deletion", createdAt: new Date().toISOString() },
    });
    assertNo(appState.error, "insert dummy app_state");

    const storagePath = `${userId}/${docId}/test.pdf`;
    const pdf = Buffer.from("%PDF-1.1\n1 0 obj <<>> endobj\ntrailer <<>>\n%%EOF\n", "utf8");
    const uploaded = await admin.storage.from("diarydock-documents").upload(storagePath, pdf, {
      contentType: "application/pdf",
      upsert: false,
    });
    assertNo(uploaded.error, "upload dummy private file");

    const document = await admin.from("documents").insert({
      id: docId,
      user_id: userId,
      title: "Deletion test PDF",
      category: "Test",
      kind: "PDF",
      size_label: "1 KB",
      room_id: "office",
      room_name: "Office",
      storage_bucket: "diarydock-documents",
      storage_path: storagePath,
      original_file_name: "test.pdf",
      mime_type: "application/pdf",
      review_status: "reviewed",
    });
    assertNo(document.error, "insert dummy document row");

    const reminder = await admin.from("reminders").insert({
      id: reminderId,
      user_id: userId,
      title: "Deletion test reminder",
      room_id: "office",
      room_name: "Office",
      reminder_group: "today",
      time_label: "Today",
      priority: "normal",
      document_id: docId,
      document_title: "Deletion test PDF",
    });
    assertNo(reminder.error, "insert dummy reminder row");

    const request = await userClient
      .rpc("request_account_deletion", {
        request_source: "automated-test",
        request_user_agent: "codex-account-deletion-flow-test",
      })
      .single();
    assertNo(request.error, "request account deletion");
    requestId = must(request.data?.id, "Deletion request id");

    const before = {
      documents: await countRows(admin, "documents", "user_id", userId),
      reminders: await countRows(admin, "reminders", "user_id", userId),
      appState: await countRows(admin, "app_state", "id", userId),
      deletionRequests: await countRows(admin, "account_deletion_requests", "user_id", userId),
    };

    const processResult = await processAccountDeletion(admin, requestId);

    const after = {
      documents: await countRows(admin, "documents", "user_id", userId),
      reminders: await countRows(admin, "reminders", "user_id", userId),
      appState: await countRows(admin, "app_state", "id", userId),
      deletionRequests: await countRows(admin, "account_deletion_requests", "user_id", userId),
    };

    const listed = await admin.storage.from("diarydock-documents").list(userId, { limit: 100 });
    assertNo(listed.error, "list storage after deletion");

    const authLookup = await admin.auth.admin.getUserById(userId);
    const signInAgain = await createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } })
      .auth.signInWithPassword({ email, password });

    const pass =
      before.documents === 1 &&
      before.reminders === 1 &&
      before.appState === 1 &&
      before.deletionRequests === 1 &&
      after.documents === 0 &&
      after.reminders === 0 &&
      after.appState === 0 &&
      after.deletionRequests === 0 &&
      (listed.data ?? []).length === 0 &&
      Boolean(authLookup.error || !authLookup.data?.user) &&
      Boolean(signInAgain.error) &&
      processResult.deletedAuthUser === true;

    console.log(JSON.stringify({
      ok: pass,
      dummyEmail: email,
      requestCreated: Boolean(requestId),
      before,
      after,
      storageObjectsRemaining: (listed.data ?? []).length,
      deletedStorageObjects: processResult.deletedStorageObjects,
      authUserDeleted: Boolean(authLookup.error || !authLookup.data?.user),
      signInBlockedAfterDeletion: Boolean(signInAgain.error),
    }, null, 2));

    if (!pass) process.exitCode = 1;
  } catch (error) {
    await cleanup(admin, userId);
    console.error(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      dummyEmail: email,
      requestCreated: Boolean(requestId),
      cleanedUp: Boolean(userId),
    }, null, 2));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exitCode = 1;
});
