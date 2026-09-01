"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
export {
  ACCEPTED_DOCUMENT_TYPES,
  DOCUMENT_BUCKET,
  MAX_DOCUMENT_BYTES,
  sanitizeDocumentFileName,
  validateDocumentUpload
} from "@/lib/document-rules";
import { sanitizeDocumentFileName, validateDocumentUpload } from "@/lib/document-rules";

export function validateDocumentFile(file: File) {
  return validateDocumentUpload(file);
}

export async function uploadPrivateDocument(file: File, documentId: string) {
  const validationError = validateDocumentFile(file);
  if (validationError) throw new Error(validationError);

  const response = await fetch("/api/documents/upload", {
    method: "POST",
    headers: {
      "Content-Type": file.type,
      "X-DiaryDock-Document-Id": documentId,
      "X-DiaryDock-File-Name": encodeURIComponent(file.name || "document"),
    },
    body: file,
  });
  const payload = await response.json().catch((): Record<string, unknown> => ({}));
  if (!response.ok || typeof payload.path !== "string" || typeof payload.bucket !== "string") {
    throw new Error(typeof payload.error === "string" ? payload.error : "DiaryDock could not securely store this document.");
  }
  return { bucket: payload.bucket, path: payload.path };
}

export async function openPrivateDocument(bucket: string | undefined, path: string | undefined) {
  if (!bucket || !path) throw new Error("The securely stored file is not available yet.");
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Secure document viewing is not available in this session.");

  const downloadName = sanitizeDocumentFileName(path.split("/").pop() || "diarydock-document");
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, 60, { download: downloadName });
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "Unable to open this document.");

  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

export async function getPrivateDocumentUrl(
  bucket: string | undefined,
  path: string | undefined,
) {
  if (!bucket || !path) return null;
  const client = getSupabaseBrowserClient();
  if (!client) return null;

  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(path, 300);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
