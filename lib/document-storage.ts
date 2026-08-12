"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export const DOCUMENT_BUCKET = "diarydock-documents";
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic"
] as const;

export function sanitizeDocumentFileName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);
}

export function validateDocumentFile(file: File) {
  if (!ACCEPTED_DOCUMENT_TYPES.includes(file.type as (typeof ACCEPTED_DOCUMENT_TYPES)[number])) {
    return "Choose a PDF, JPEG, PNG, WebP or HEIC file.";
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return "Please choose a file smaller than 10 MB.";
  }
  if (file.size === 0) {
    return "This file is empty. Please choose another file.";
  }
  return null;
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
