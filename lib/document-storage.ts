"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
export {
  ACCEPTED_DOCUMENT_TYPES,
  DOCUMENT_BUCKET,
  MAX_DOCUMENT_BYTES,
  sanitizeDocumentFileName,
  validateDocumentUpload
} from "@/lib/document-rules";
import { DOCUMENT_BUCKET, sanitizeDocumentFileName, validateDocumentUpload } from "@/lib/document-rules";

export function validateDocumentFile(file: File) {
  return validateDocumentUpload(file);
}

export async function uploadPrivateDocument(file: File, documentId: string) {
  const validationError = validateDocumentFile(file);
  if (validationError) throw new Error(validationError);

  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Secure document storage is not available in this session.");

  const {
    data: { user },
    error: userError
  } = await client.auth.getUser();

  if (userError || !user) throw new Error("Please sign in again before saving this document.");

  const safeName = sanitizeDocumentFileName(file.name || "document");
  const storagePath = `${user.id}/${documentId}/${safeName || "document"}`;
  const { error } = await client.storage.from(DOCUMENT_BUCKET).upload(storagePath, file, {
    contentType: file.type,
    upsert: false
  });

  if (error) throw new Error(error.message);

  return { bucket: DOCUMENT_BUCKET, path: storagePath };
}

export async function openPrivateDocument(bucket: string | undefined, path: string | undefined) {
  if (!bucket || !path) throw new Error("The securely stored file is not available yet.");
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Secure document viewing is not available in this session.");

  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, 60);
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
