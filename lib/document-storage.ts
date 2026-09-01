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

  const prepareResponse = await fetch("/api/documents/uploads/prepare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      documentId,
      fileName: file.name || "document",
      mimeType: file.type,
      size: file.size,
    }),
  });
  const prepared = await prepareResponse.json().catch((): Record<string, unknown> => ({}));
  if (
    !prepareResponse.ok || typeof prepared.reservationId !== "string" ||
    typeof prepared.bucket !== "string" || typeof prepared.path !== "string" || typeof prepared.token !== "string"
  ) {
    throw new Error(typeof prepared.error === "string" ? prepared.error : "DiaryDock could not securely prepare this document.");
  }

  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Secure document storage is not available in this session.");

  try {
    const { error: uploadError } = await client.storage
      .from(prepared.bucket)
      .uploadToSignedUrl(prepared.path, prepared.token, file, {
        contentType: file.type,
        upsert: false,
      });
    if (uploadError) throw new Error(uploadError.message);

    const commitRequest = () => fetch("/api/documents/uploads/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: prepared.reservationId }),
      });
    let commitResponse: Response;
    try {
      commitResponse = await commitRequest();
    } catch {
      // A response can be lost after the server commits. The endpoint is idempotent.
      commitResponse = await commitRequest();
    }
    const committed = await commitResponse.json().catch((): Record<string, unknown> => ({}));
    if (!commitResponse.ok || typeof committed.path !== "string" || typeof committed.bucket !== "string") {
      throw new Error(typeof committed.error === "string" ? committed.error : "DiaryDock could not securely store this document.");
    }
    return { bucket: committed.bucket, path: committed.path };
  } catch (error) {
    await fetch("/api/documents/uploads/commit", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId: prepared.reservationId }),
    }).catch(() => undefined);
    throw error;
  }
}

export async function analysePrivateDocument<T>(
  stored: { bucket: string; path: string },
  analysisMode: "document" | "will" | "bill" | "insurance" | "receipt" = "document",
) {
  const response = await fetch("/api/capture/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ analysisMode, storedFiles: [stored] }),
  });
  const payload = await response.json().catch((): Record<string, unknown> => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "The document could not be analysed.");
  }
  return payload as T;
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
