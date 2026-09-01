// @ts-nocheck
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { assertDisposableRlsTarget } from "./household-sharing-rls-safety.ts";

const BUCKET = "diarydock-documents";
const PURPOSE = "DiaryDock household sharing RLS test";

type Client = ReturnType<typeof createClient>;
type Actor = {
  label: string;
  email: string;
  password: string;
  userId: string;
  client: Client;
};
type TestDocument = {
  id: string;
  title: string;
  storagePath: string;
};
type Check = {
  name: string;
  passed: boolean;
  detail?: string;
};

function must(value: string | undefined | null, label: string) {
  if (!value) throw new Error(`${label} is missing.`);
  return value;
}

function assertNo(error: { message: string } | null, step: string) {
  if (error) throw new Error(`${step}: ${error.message}`);
}

function parseEnv(filePath: string) {
  const values: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return values;

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function readLinkedProjectRef() {
  const path = "supabase/.temp/project-ref";
  return fs.existsSync(path) ? fs.readFileSync(path, "utf8").trim() : undefined;
}

function testClient(url: string, key: string) {
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function createActor(
  admin: Client,
  url: string,
  anonKey: string,
  runId: string,
  label: string,
): Promise<Actor> {
  const suffix = `${runId}-${label}`;
  const email = `hello+household-rls-${suffix}@diarydock.com`;
  const password = `Rls-${randomUUID()}!Aa1`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { purpose: PURPOSE, test_run_id: runId, test_actor: label },
  });
  assertNo(created.error, `create ${label} auth user`);
  const userId = must(created.data.user?.id, `${label} user id`);
  const client = testClient(url, anonKey);
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) {
    await admin.auth.admin.deleteUser(userId).catch(() => undefined);
    throw new Error(`sign in ${label}: ${signedIn.error.message}`);
  }
  return { label, email, password, userId, client };
}

async function joinHousehold(owner: Actor, member: Actor) {
  const invite = await owner.client.rpc("create_household_role_invite", {
    invite_email: member.email,
    invite_name: `RLS ${member.label}`,
    invite_relation: "Automated security test",
    invite_role: "viewer",
  });
  assertNo(invite.error, `invite ${member.label}`);
  const token = must(invite.data, `${member.label} invite token`);
  const accepted = await member.client.rpc("accept_household_invite", { invite_token: token });
  assertNo(accepted.error, `accept ${member.label} invite`);
}

async function createDocument(owner: Actor, label: string, trackedPaths: string[]) {
  const id = randomUUID();
  const storagePath = `${owner.userId}/${id}/${label}.pdf`;
  const title = `RLS ${label} ${id.slice(0, 8)}`;
  const pdf = Buffer.from(`%PDF-1.1\n% DiaryDock RLS ${label}\n%%EOF\n`, "utf8");

  const uploaded = await owner.client.storage.from(BUCKET).upload(storagePath, pdf, {
    contentType: "application/pdf",
    upsert: false,
  });
  assertNo(uploaded.error, `upload ${label} file`);
  trackedPaths.push(storagePath);

  const inserted = await owner.client.from("documents").insert({
    id,
    user_id: owner.userId,
    title,
    category: "Test",
    kind: "PDF",
    size_label: `${pdf.length} B`,
    room_id: "office",
    room_name: "Office",
    storage_bucket: BUCKET,
    storage_path: storagePath,
    original_file_name: `${label}.pdf`,
    mime_type: "application/pdf",
    review_status: "reviewed",
  });
  assertNo(inserted.error, `insert ${label} document`);
  return { id, title, storagePath } satisfies TestDocument;
}

async function setSharing(owner: Actor, document: TestDocument, visibility: string, selected: string[] = []) {
  const result = await owner.client.rpc("set_document_sharing", {
    target_document_id: document.id,
    new_visibility: visibility,
    selected_user_ids: selected,
  });
  assertNo(result.error, `set ${document.id} to ${visibility}`);
}

function addCheck(checks: Check[], name: string, passed: boolean, detail?: string) {
  checks.push({ name, passed, ...(detail ? { detail } : {}) });
}

async function checkDocumentAccess(
  checks: Check[],
  actor: Actor,
  document: TestDocument,
  expected: boolean,
  context: string,
  checkFile = true,
) {
  const row = await actor.client
    .from("documents")
    .select("id,title,user_id")
    .eq("id", document.id)
    .maybeSingle();
  const canReadRow = !row.error && row.data?.id === document.id;
  addCheck(
    checks,
    `${context}: ${actor.label} ${expected ? "can" : "cannot"} read the database row`,
    canReadRow === expected,
    row.error?.message,
  );

  if (!checkFile) return;

  const file = await actor.client.storage.from(BUCKET).download(document.storagePath);
  const canReadFile = !file.error && Boolean(file.data);
  addCheck(
    checks,
    `${context}: ${actor.label} ${expected ? "can" : "cannot"} read the stored file`,
    canReadFile === expected,
    file.error?.message,
  );
}

async function cleanup(
  admin: Client,
  userIds: string[],
  documentIds: string[],
  storagePaths: string[],
) {
  const warnings: string[] = [];
  const capture = async (label: string, operation: PromiseLike<{ error: { message: string } | null }>) => {
    try {
      const result = await operation;
      if (result.error) warnings.push(`${label}: ${result.error.message}`);
    } catch (error) {
      warnings.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  if (storagePaths.length) {
    await capture("remove test files", admin.storage.from(BUCKET).remove(storagePaths));
  }
  if (documentIds.length) {
    await capture("remove test documents", admin.from("documents").delete().in("id", documentIds));
  }
  if (userIds.length) {
    await capture("remove test app state", admin.from("app_state").delete().in("id", userIds));
    await capture("remove test audit events", admin.from("audit_events").delete().in("user_id", userIds));
    await capture("remove test households", admin.from("households").delete().in("owner_id", userIds));
  }

  for (const userId of [...userIds].reverse()) {
    try {
      const lookup = await admin.auth.admin.getUserById(userId);
      if (lookup.data.user?.user_metadata?.purpose !== PURPOSE) {
        warnings.push(`refused to delete unmarked auth user ${userId}`);
        continue;
      }
      const deleted = await admin.auth.admin.deleteUser(userId);
      if (deleted.error) warnings.push(`delete auth user ${userId}: ${deleted.error.message}`);
    } catch (error) {
      warnings.push(`delete auth user ${userId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return warnings;
}

async function main() {
  const url = must(process.env.DIARYDOCK_RLS_SUPABASE_URL, "DIARYDOCK_RLS_SUPABASE_URL");
  const anonKey = must(process.env.DIARYDOCK_RLS_SUPABASE_ANON_KEY, "DIARYDOCK_RLS_SUPABASE_ANON_KEY");
  const serviceKey = must(
    process.env.DIARYDOCK_RLS_SUPABASE_SERVICE_ROLE_KEY,
    "DIARYDOCK_RLS_SUPABASE_SERVICE_ROLE_KEY",
  );
  const localEnv = parseEnv(".env.local");
  const target = assertDisposableRlsTarget({
    testUrl: url,
    confirmation: process.env.DIARYDOCK_RLS_TEST_CONFIRM,
    linkedUrl: localEnv.NEXT_PUBLIC_SUPABASE_URL,
    linkedProjectRef: readLinkedProjectRef(),
    allowLinkedProject: process.env.DIARYDOCK_RLS_ALLOW_LINKED_PROJECT === "true",
  });

  const admin = testClient(url, serviceKey);
  const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const checks: Check[] = [];
  const actors: Actor[] = [];
  const documents: TestDocument[] = [];
  const storagePaths: string[] = [];
  let setupError: string | null = null;

  try {
    const prerequisite = await admin.from("shared_resources").select("id", { head: true, count: "exact" });
    if (prerequisite.error) {
      throw new Error(
        `Sharing schema is unavailable (${prerequisite.error.message}). Apply the pending migrations to this disposable project first.`,
      );
    }
    const bucket = await admin.storage.getBucket(BUCKET);
    assertNo(bucket.error, `find ${BUCKET} bucket`);

    const owner = await createActor(admin, url, anonKey, runId, "owner");
    actors.push(owner);
    const selected = await createActor(admin, url, anonKey, runId, "selected");
    actors.push(selected);
    const householdOnly = await createActor(admin, url, anonKey, runId, "household-only");
    actors.push(householdOnly);
    const removed = await createActor(admin, url, anonKey, runId, "removed");
    actors.push(removed);
    const unrelated = await createActor(admin, url, anonKey, runId, "unrelated");
    actors.push(unrelated);

    const ownerHousehold = await owner.client.rpc("ensure_user_household");
    assertNo(ownerHousehold.error, "create owner household");
    await joinHousehold(owner, selected);
    await joinHousehold(owner, householdOnly);
    await joinHousehold(owner, removed);
    const unrelatedHousehold = await unrelated.client.rpc("ensure_user_household");
    assertNo(unrelatedHousehold.error, "create unrelated household");
    addCheck(
      checks,
      "unrelated account belongs to a different household",
      Boolean(ownerHousehold.data && unrelatedHousehold.data && ownerHousehold.data !== unrelatedHousehold.data),
    );

    const privateDocument = await createDocument(owner, "private", storagePaths);
    documents.push(privateDocument);
    const selectedDocument = await createDocument(owner, "selected", storagePaths);
    documents.push(selectedDocument);
    const householdDocument = await createDocument(owner, "household", storagePaths);
    documents.push(householdDocument);
    const revokedDocument = await createDocument(owner, "revoked", storagePaths);
    documents.push(revokedDocument);

    await setSharing(owner, privateDocument, "PRIVATE");
    await setSharing(owner, selectedDocument, "SELECTED_MEMBERS", [selected.userId]);
    await setSharing(owner, householdDocument, "HOUSEHOLD");
    await setSharing(owner, revokedDocument, "SELECTED_MEMBERS", [removed.userId]);

    await checkDocumentAccess(checks, owner, privateDocument, true, "private");
    await checkDocumentAccess(checks, selected, privateDocument, false, "private");
    await checkDocumentAccess(checks, householdOnly, privateDocument, false, "private");
    await checkDocumentAccess(checks, unrelated, privateDocument, false, "private");

    await checkDocumentAccess(checks, owner, selectedDocument, true, "selected members");
    await checkDocumentAccess(checks, selected, selectedDocument, true, "selected members");
    await checkDocumentAccess(checks, householdOnly, selectedDocument, false, "selected members");
    await checkDocumentAccess(checks, unrelated, selectedDocument, false, "selected members");

    await checkDocumentAccess(checks, owner, householdDocument, true, "whole household");
    await checkDocumentAccess(checks, selected, householdDocument, true, "whole household");
    await checkDocumentAccess(checks, householdOnly, householdDocument, true, "whole household");
    await checkDocumentAccess(checks, removed, householdDocument, true, "whole household before removal");
    await checkDocumentAccess(checks, unrelated, householdDocument, false, "whole household");

    await checkDocumentAccess(checks, removed, revokedDocument, true, "selected grant before removal");

    const recipientUpdate = await selected.client
      .from("documents")
      .update({ title: "Recipient changed this" })
      .eq("id", selectedDocument.id)
      .select("id");
    const titleAfterUpdate = await admin
      .from("documents")
      .select("title")
      .eq("id", selectedDocument.id)
      .single();
    addCheck(
      checks,
      "shared recipient cannot update the document row",
      (recipientUpdate.data ?? []).length === 0 && titleAfterUpdate.data?.title === selectedDocument.title,
      recipientUpdate.error?.message,
    );

    const recipientFileUpdate = await selected.client.storage.from(BUCKET).upload(
      selectedDocument.storagePath,
      Buffer.from("recipient overwrite attempt", "utf8"),
      { contentType: "application/pdf", upsert: true },
    );
    const ownerFileAfterUpdate = await owner.client.storage.from(BUCKET).download(selectedDocument.storagePath);
    addCheck(
      checks,
      "shared recipient cannot overwrite the stored file",
      Boolean(recipientFileUpdate.error) && !ownerFileAfterUpdate.error && Boolean(ownerFileAfterUpdate.data),
      recipientFileUpdate.error?.message,
    );

    const selectedResource = await admin
      .from("shared_resources")
      .select("id")
      .eq("owner_id", owner.userId)
      .eq("resource_type", "document")
      .eq("resource_id", selectedDocument.id)
      .single();
    assertNo(selectedResource.error, "read selected shared resource as test admin");
    const selectedPermission = await admin
      .from("resource_permissions")
      .select("id,can_edit")
      .eq("shared_resource_id", selectedResource.data.id)
      .eq("subject_user_id", selected.userId)
      .single();
    assertNo(selectedPermission.error, "read selected permission as test admin");

    const permissionEscalation = await selected.client
      .from("resource_permissions")
      .update({ can_edit: true })
      .eq("id", selectedPermission.data.id)
      .select("id");
    const permissionAfterEscalation = await admin
      .from("resource_permissions")
      .select("can_edit")
      .eq("id", selectedPermission.data.id)
      .single();
    addCheck(
      checks,
      "shared recipient cannot grant themselves edit permission",
      Boolean(permissionEscalation.error) && permissionAfterEscalation.data?.can_edit === false,
      permissionEscalation.error?.message,
    );

    const directGrant = await householdOnly.client.from("resource_permissions").insert({
      shared_resource_id: selectedResource.data.id,
      subject_user_id: householdOnly.userId,
      can_view: true,
      can_edit: false,
      granted_by: householdOnly.userId,
    });
    const directGrantLookup = await admin
      .from("resource_permissions")
      .select("id", { count: "exact", head: true })
      .eq("shared_resource_id", selectedResource.data.id)
      .eq("subject_user_id", householdOnly.userId);
    addCheck(
      checks,
      "household member cannot create a direct permission grant",
      Boolean(directGrant.error) && (directGrantLookup.count ?? 0) === 0,
      directGrant.error?.message,
    );

    const recipientReshare = await selected.client.rpc("set_document_sharing", {
      target_document_id: selectedDocument.id,
      new_visibility: "HOUSEHOLD",
      selected_user_ids: [],
    });
    addCheck(
      checks,
      "shared recipient cannot change the sharing mode",
      Boolean(recipientReshare.error),
      recipientReshare.error?.message,
    );

    const recipientDelete = await selected.client
      .from("documents")
      .delete()
      .eq("id", selectedDocument.id)
      .select("id");
    const rowAfterDelete = await admin
      .from("documents")
      .select("id")
      .eq("id", selectedDocument.id)
      .maybeSingle();
    addCheck(
      checks,
      "shared recipient cannot delete the document row",
      (recipientDelete.data ?? []).length === 0 && rowAfterDelete.data?.id === selectedDocument.id,
      recipientDelete.error?.message,
    );

    const recipientFileDelete = await selected.client.storage.from(BUCKET).remove([selectedDocument.storagePath]);
    const ownerFileAfterDelete = await owner.client.storage.from(BUCKET).download(selectedDocument.storagePath);
    addCheck(
      checks,
      "shared recipient cannot delete the stored file",
      !ownerFileAfterDelete.error && Boolean(ownerFileAfterDelete.data),
      recipientFileDelete.error?.message,
    );

    const removedResult = await owner.client.rpc("remove_household_member", {
      member_user_id: removed.userId,
    });
    assertNo(removedResult.error, "remove household member");
    addCheck(checks, "owner removal RPC reports a change", removedResult.data === true);

    await checkDocumentAccess(
      checks,
      removed,
      revokedDocument,
      false,
      "selected grant after removal",
      false,
    );
    await checkDocumentAccess(
      checks,
      removed,
      householdDocument,
      false,
      "whole household after removal",
      false,
    );

    const removedResourceDecision = await removed.client.rpc("can_access_shared_resource", {
      target_resource_type: "document",
      target_resource_id: revokedDocument.id,
      target_owner_id: owner.userId,
      requested_action: "VIEW",
    });
    addCheck(
      checks,
      "authorization function denies the removed member",
      !removedResourceDecision.error && removedResourceDecision.data === false,
      removedResourceDecision.error?.message,
    );

    const removedStorageDecision = await removed.client.rpc("can_read_document_storage", {
      object_name: revokedDocument.storagePath,
    });
    addCheck(
      checks,
      "storage authorization function denies the removed member",
      !removedStorageDecision.error && removedStorageDecision.data === false,
      removedStorageDecision.error?.message,
    );

    const removedSignedUrl = await removed.client.storage
      .from(BUCKET)
      .createSignedUrl(revokedDocument.storagePath, 60);
    addCheck(
      checks,
      "removed member cannot create a new signed file link",
      Boolean(removedSignedUrl.error) && !removedSignedUrl.data?.signedUrl,
      removedSignedUrl.error?.message,
    );

    const freshRemovedClient = testClient(url, anonKey);
    const freshRemovedSignIn = await freshRemovedClient.auth.signInWithPassword({
      email: removed.email,
      password: removed.password,
    });
    assertNo(freshRemovedSignIn.error, "sign removed member into a fresh client");
    for (const [label, document] of [
      ["selected grant", revokedDocument],
      ["whole household", householdDocument],
    ] as const) {
      const freshRemovedDownload = await freshRemovedClient.storage
        .from(BUCKET)
        .download(document.storagePath);
      addCheck(
        checks,
        `fresh removed-member session cannot download the ${label} file`,
        Boolean(freshRemovedDownload.error) && !freshRemovedDownload.data,
        freshRemovedDownload.error?.message,
      );
    }

    const revokedPermission = await admin
      .from("resource_permissions")
      .select("revoked_at")
      .eq("subject_user_id", removed.userId)
      .not("revoked_at", "is", null)
      .maybeSingle();
    addCheck(
      checks,
      "removing a member revokes their selected permission record",
      !revokedPermission.error && Boolean(revokedPermission.data?.revoked_at),
      revokedPermission.error?.message,
    );

    const regrantRemoved = await owner.client.rpc("set_document_sharing", {
      target_document_id: revokedDocument.id,
      new_visibility: "SELECTED_MEMBERS",
      selected_user_ids: [removed.userId],
    });
    addCheck(
      checks,
      "owner cannot grant a document to a removed household member",
      Boolean(regrantRemoved.error),
      regrantRemoved.error?.message,
    );
  } catch (error) {
    setupError = error instanceof Error ? error.message : String(error);
  }

  const cleanupWarnings = await cleanup(
    admin,
    actors.map((actor) => actor.userId),
    documents.map((document) => document.id),
    storagePaths,
  );
  const failedChecks = checks.filter((check) => !check.passed);
  const ok = !setupError && failedChecks.length === 0 && cleanupWarnings.length === 0;

  console.log(JSON.stringify({
    ok,
    target: target.isLocal ? "local disposable Supabase" : "disposable Supabase project",
    runId,
    checksPassed: checks.length - failedChecks.length,
    checksRun: checks.length,
    failedChecks,
    setupError,
    cleanupWarnings,
  }, null, 2));

  if (!ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exitCode = 1;
});
