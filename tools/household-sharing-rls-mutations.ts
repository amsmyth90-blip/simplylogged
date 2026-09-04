// @ts-nocheck
import { RLS_BUCKET, addCheck, assertNo } from "./household-sharing-rls-fixtures.ts";
import type { RlsScenario } from "./household-sharing-rls-setup.ts";

export async function runRlsMutationChecks(test: RlsScenario) {
  const { admin, checks, householdOnly, owner, selected, selectedDocument } = test;
  const recipientUpdate = await selected.client.from("documents").update({ title: "Recipient changed this" }).eq("id", selectedDocument.id).select("id");
  const titleAfterUpdate = await admin.from("documents").select("title").eq("id", selectedDocument.id).single();
  addCheck(checks, "shared recipient cannot update the document row", (recipientUpdate.data ?? []).length === 0 && titleAfterUpdate.data?.title === selectedDocument.title, recipientUpdate.error?.message);

  const recipientFileUpdate = await selected.client.storage.from(RLS_BUCKET).upload(selectedDocument.storagePath, Buffer.from("recipient overwrite attempt", "utf8"), { contentType: "application/pdf", upsert: true });
  const ownerFileAfterUpdate = await owner.client.storage.from(RLS_BUCKET).download(selectedDocument.storagePath);
  addCheck(checks, "shared recipient cannot overwrite the stored file", Boolean(recipientFileUpdate.error) && !ownerFileAfterUpdate.error && Boolean(ownerFileAfterUpdate.data), recipientFileUpdate.error?.message);

  const selectedResource = await admin.from("shared_resources").select("id").eq("owner_id", owner.userId).eq("resource_type", "document").eq("resource_id", selectedDocument.id).single();
  assertNo(selectedResource.error, "read selected shared resource as test admin");
  const selectedPermission = await admin.from("resource_permissions").select("id,can_edit").eq("shared_resource_id", selectedResource.data.id).eq("subject_user_id", selected.userId).single();
  assertNo(selectedPermission.error, "read selected permission as test admin");
  const permissionEscalation = await selected.client.from("resource_permissions").update({ can_edit: true }).eq("id", selectedPermission.data.id).select("id");
  const permissionAfterEscalation = await admin.from("resource_permissions").select("can_edit").eq("id", selectedPermission.data.id).single();
  addCheck(checks, "shared recipient cannot grant themselves edit permission", Boolean(permissionEscalation.error) && permissionAfterEscalation.data?.can_edit === false, permissionEscalation.error?.message);

  const directGrant = await householdOnly.client.from("resource_permissions").insert({ shared_resource_id: selectedResource.data.id, subject_user_id: householdOnly.userId, can_view: true, can_edit: false, granted_by: householdOnly.userId });
  const directGrantLookup = await admin.from("resource_permissions").select("id", { count: "exact", head: true }).eq("shared_resource_id", selectedResource.data.id).eq("subject_user_id", householdOnly.userId);
  addCheck(checks, "household member cannot create a direct permission grant", Boolean(directGrant.error) && (directGrantLookup.count ?? 0) === 0, directGrant.error?.message);

  const recipientReshare = await selected.client.rpc("set_document_sharing", { target_document_id: selectedDocument.id, new_visibility: "HOUSEHOLD", selected_user_ids: [] });
  addCheck(checks, "shared recipient cannot change the sharing mode", Boolean(recipientReshare.error), recipientReshare.error?.message);
  const recipientDelete = await selected.client.from("documents").delete().eq("id", selectedDocument.id).select("id");
  const rowAfterDelete = await admin.from("documents").select("id").eq("id", selectedDocument.id).maybeSingle();
  addCheck(checks, "shared recipient cannot delete the document row", (recipientDelete.data ?? []).length === 0 && rowAfterDelete.data?.id === selectedDocument.id, recipientDelete.error?.message);
  const recipientFileDelete = await selected.client.storage.from(RLS_BUCKET).remove([selectedDocument.storagePath]);
  const ownerFileAfterDelete = await owner.client.storage.from(RLS_BUCKET).download(selectedDocument.storagePath);
  addCheck(checks, "shared recipient cannot delete the stored file", !ownerFileAfterDelete.error && Boolean(ownerFileAfterDelete.data), recipientFileDelete.error?.message);
}
