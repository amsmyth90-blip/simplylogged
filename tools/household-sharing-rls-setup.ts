// @ts-nocheck
import { createHash, randomUUID } from "node:crypto";

import {
  RLS_BUCKET,
  addCheck,
  assertNo,
  createActor,
  createDocument,
  joinHousehold,
  rlsClient,
  setSharing,
  type RlsActor,
  type RlsCheck,
  type RlsClient,
  type RlsDocument
} from "./household-sharing-rls-fixtures.ts";

export type RlsScenario = {
  admin: RlsClient;
  anonKey: string;
  url: string;
  checks: RlsCheck[];
  actors: RlsActor[];
  documents: RlsDocument[];
  storagePaths: string[];
  owner: RlsActor;
  selected: RlsActor;
  householdOnly: RlsActor;
  removed: RlsActor;
  unrelated: RlsActor;
  privateDocument: RlsDocument;
  selectedDocument: RlsDocument;
  householdDocument: RlsDocument;
  revokedDocument: RlsDocument;
};

export async function setupRlsScenario({ admin, anonKey, url, runId, checks, actors, documents, storagePaths }: { admin: RlsClient; anonKey: string; url: string; runId: string; checks: RlsCheck[]; actors: RlsActor[]; documents: RlsDocument[]; storagePaths: string[] }): Promise<RlsScenario> {
  const prerequisite = await admin.from("shared_resources").select("id", { head: true, count: "exact" });
  if (prerequisite.error) throw new Error(`Sharing schema is unavailable (${prerequisite.error.message}). Apply the pending migrations to this disposable project first.`);
  const bucket = await admin.storage.getBucket(RLS_BUCKET);
  assertNo(bucket.error, `find ${RLS_BUCKET} bucket`);

  const owner = await createActor(admin, url, anonKey, runId, "owner"); actors.push(owner);
  const selected = await createActor(admin, url, anonKey, runId, "selected"); actors.push(selected);
  const householdOnly = await createActor(admin, url, anonKey, runId, "household-only"); actors.push(householdOnly);
  const removed = await createActor(admin, url, anonKey, runId, "removed"); actors.push(removed);
  const unrelated = await createActor(admin, url, anonKey, runId, "unrelated"); actors.push(unrelated);

  const ownerHousehold = await owner.client.rpc("ensure_user_household");
  assertNo(ownerHousehold.error, "create owner household");
  await joinHousehold(owner, selected);
  await joinHousehold(owner, householdOnly);
  await joinHousehold(owner, removed);

  const publicLimiter = await rlsClient(url, anonKey).rpc("check_rate_limit", { bucket_key: createHash("sha256").update(randomUUID()).digest("hex"), max_requests: 1, window_seconds: 60 });
  addCheck(checks, "anonymous callers cannot write arbitrary shared rate-limit buckets", Boolean(publicLimiter.error), publicLimiter.error?.message);
  const deletion = await admin.rpc("prepare_account_deletion", { input_user_id: owner.userId });
  const householdAfterDeletion = await admin.from("households").select("id").eq("id", ownerHousehold.data).maybeSingle();
  addCheck(checks, "owner deletion is blocked while another active household member exists", Boolean(deletion.error) && householdAfterDeletion.data?.id === ownerHousehold.data, deletion.error?.message);

  const actionRequestId = randomUUID();
  const insertedAction = await owner.client.from("action_requests").insert({ id: actionRequestId, user_id: owner.userId, action_type: "create_reminder", risk_level: "low", status: "proposed", title: "RLS audit test", summary: "Verify atomic action completion auditing.", proposed_payload: {}, requested_by: "system" });
  assertNo(insertedAction.error, "create action request for audit test");
  const finalizedAction = await owner.client.rpc("finalize_action_request", { input_action_request_id: actionRequestId, input_decision: "approve", input_completed: true });
  const completedAudit = await admin.from("audit_events").select("id").eq("action_request_id", actionRequestId).eq("event_type", "ACTION_COMPLETED");
  addCheck(checks, "action completion and its audit event commit through one database RPC", !finalizedAction.error && (completedAudit.data ?? []).length === 1, finalizedAction.error?.message ?? completedAudit.error?.message);
  const unrelatedHousehold = await unrelated.client.rpc("ensure_user_household");
  assertNo(unrelatedHousehold.error, "create unrelated household");
  addCheck(checks, "unrelated account belongs to a different household", Boolean(ownerHousehold.data && unrelatedHousehold.data && ownerHousehold.data !== unrelatedHousehold.data));

  const privateDocument = await createDocument(admin, owner, "private", storagePaths); documents.push(privateDocument);
  const selectedDocument = await createDocument(admin, owner, "selected", storagePaths); documents.push(selectedDocument);
  const householdDocument = await createDocument(admin, owner, "household", storagePaths); documents.push(householdDocument);
  const revokedDocument = await createDocument(admin, owner, "revoked", storagePaths); documents.push(revokedDocument);
  await setSharing(owner, privateDocument, "PRIVATE");
  await setSharing(owner, selectedDocument, "SELECTED_MEMBERS", [selected.userId]);
  await setSharing(owner, householdDocument, "HOUSEHOLD");
  await setSharing(owner, revokedDocument, "SELECTED_MEMBERS", [removed.userId]);

  return { admin, anonKey, url, checks, actors, documents, storagePaths, owner, selected, householdOnly, removed, unrelated, privateDocument, selectedDocument, householdDocument, revokedDocument };
}
