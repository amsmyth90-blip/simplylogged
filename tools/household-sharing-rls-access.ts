// @ts-nocheck
import { randomUUID } from "node:crypto";
import { RLS_BUCKET, addCheck, checkDocumentAccess } from "./household-sharing-rls-fixtures.ts";
import type { RlsScenario } from "./household-sharing-rls-setup.ts";

export async function runRlsAccessChecks(test: RlsScenario) {
  const { admin, checks, householdDocument, householdOnly, owner, privateDocument, revokedDocument, selected, selectedDocument, storagePaths, unrelated, removed } = test;
  await checkDocumentAccess(checks, owner, privateDocument, true, "private");
  await checkDocumentAccess(checks, selected, privateDocument, false, "private");
  await checkDocumentAccess(checks, householdOnly, privateDocument, false, "private");
  await checkDocumentAccess(checks, unrelated, privateDocument, false, "private");
  await checkDocumentAccess(checks, owner, selectedDocument, true, "selected members");
  await checkDocumentAccess(checks, selected, selectedDocument, true, "selected members");
  await checkDocumentAccess(checks, householdOnly, selectedDocument, false, "selected members");
  await checkDocumentAccess(checks, unrelated, selectedDocument, false, "selected members");

  const directOwnerUploadPath = `${owner.userId}/${randomUUID()}/bypass.pdf`;
  storagePaths.push(directOwnerUploadPath);
  const directOwnerUpload = await owner.client.storage.from(RLS_BUCKET).upload(directOwnerUploadPath, Buffer.from("%PDF-1.1\n%%EOF\n", "utf8"), { contentType: "application/pdf", upsert: false });
  addCheck(checks, "authenticated clients cannot bypass server-side file inspection", Boolean(directOwnerUpload.error), directOwnerUpload.error?.message);
  const clonedPath = await selected.client.from("documents").insert({ id: randomUUID(), user_id: selected.userId, title: "Cloned path attempt", category: "Test", kind: "PDF", size_label: "1 KB", storage_bucket: RLS_BUCKET, storage_path: selectedDocument.storagePath, original_file_name: "clone.pdf", mime_type: "application/pdf", review_status: "reviewed" });
  addCheck(checks, "shared recipient cannot bind another owner's storage path to their own document", Boolean(clonedPath.error), clonedPath.error?.message);

  await checkDocumentAccess(checks, owner, householdDocument, true, "whole household");
  await checkDocumentAccess(checks, selected, householdDocument, true, "whole household");
  await checkDocumentAccess(checks, householdOnly, householdDocument, true, "whole household");
  await checkDocumentAccess(checks, removed, householdDocument, true, "whole household before removal");
  await checkDocumentAccess(checks, unrelated, householdDocument, false, "whole household");
  await checkDocumentAccess(checks, removed, revokedDocument, true, "selected grant before removal");
}
