// @ts-nocheck
import { RLS_BUCKET, addCheck, assertNo, checkDocumentAccess, rlsClient } from "./household-sharing-rls-fixtures.ts";
import type { RlsScenario } from "./household-sharing-rls-setup.ts";

export async function runRlsRemovalChecks(test: RlsScenario) {
  const { admin, anonKey, checks, householdDocument, owner, removed, revokedDocument, url } = test;
  const removedResult = await owner.client.rpc("remove_household_member", { member_user_id: removed.userId });
  assertNo(removedResult.error, "remove household member");
  addCheck(checks, "owner removal RPC reports a change", removedResult.data === true);
  await checkDocumentAccess(checks, removed, revokedDocument, false, "selected grant after removal", false);
  await checkDocumentAccess(checks, removed, householdDocument, false, "whole household after removal", false);

  const resourceDecision = await removed.client.rpc("can_access_shared_resource", { target_resource_type: "document", target_resource_id: revokedDocument.id, target_owner_id: owner.userId, requested_action: "VIEW" });
  addCheck(checks, "authorization function denies the removed member", !resourceDecision.error && resourceDecision.data === false, resourceDecision.error?.message);
  const storageDecision = await removed.client.rpc("can_read_document_storage", { object_name: revokedDocument.storagePath });
  addCheck(checks, "storage authorization function denies the removed member", !storageDecision.error && storageDecision.data === false, storageDecision.error?.message);
  const removedSignedUrl = await removed.client.storage.from(RLS_BUCKET).createSignedUrl(revokedDocument.storagePath, 60);
  addCheck(checks, "removed member cannot create a new signed file link", Boolean(removedSignedUrl.error) && !removedSignedUrl.data?.signedUrl, removedSignedUrl.error?.message);

  const freshClient = rlsClient(url, anonKey);
  const freshSignIn = await freshClient.auth.signInWithPassword({ email: removed.email, password: removed.password });
  assertNo(freshSignIn.error, "sign removed member into a fresh client");
  for (const [label, document] of [["selected grant", revokedDocument], ["whole household", householdDocument]] as const) {
    const download = await freshClient.storage.from(RLS_BUCKET).download(document.storagePath);
    addCheck(checks, `fresh removed-member session cannot download the ${label} file`, Boolean(download.error) && !download.data, download.error?.message);
  }
  const revokedPermission = await admin.from("resource_permissions").select("revoked_at").eq("subject_user_id", removed.userId).not("revoked_at", "is", null).maybeSingle();
  addCheck(checks, "removing a member revokes their selected permission record", !revokedPermission.error && Boolean(revokedPermission.data?.revoked_at), revokedPermission.error?.message);
  const regrantRemoved = await owner.client.rpc("set_document_sharing", { target_document_id: revokedDocument.id, new_visibility: "SELECTED_MEMBERS", selected_user_ids: [removed.userId] });
  addCheck(checks, "owner cannot grant a document to a removed household member", Boolean(regrantRemoved.error), regrantRemoved.error?.message);
}
