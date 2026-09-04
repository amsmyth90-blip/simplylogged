import { getRequestMediaType, RequestBodyError } from "@/lib/http/bounded-body";
import { readBoundedFormData } from "@/lib/http/bounded-form-data";
import { readBoundedJson } from "@/lib/http/bounded-json";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { isOwnedStoredDocument, type StoredDocumentReference } from "@/lib/document-upload";
import { MAX_DOCUMENT_BYTES } from "@/lib/document-rules";

import { loadBoundedStoredFiles } from "./bounded-stored-files.ts";
import { getAnalysisMode, type AnalysisMode, type CaptureFile } from "./analysis-types.ts";

const MAX_PAGE_COUNT = 12;
const MAX_REQUEST_BYTES = 4 * 1024 * 1024;
const MAX_MULTIPART_OVERHEAD = 512 * 1024;

type InputResult =
  | { ok: true; analysisMode: AnalysisMode; files: CaptureFile[] }
  | { ok: false; error: string; status: number };

function storedReference(value: unknown): value is StoredDocumentReference {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.bucket === "string" && typeof record.path === "string";
}

function validateFiles(files: CaptureFile[]): InputResult | null {
  if (!files.length) return { ok: false, error: "Please upload at least one document page.", status: 400 };
  if (files.length > MAX_PAGE_COUNT) {
    return { ok: false, error: `Please keep each document to ${MAX_PAGE_COUNT} pages or fewer.`, status: 400 };
  }
  if (files.some((file) => file.size > MAX_DOCUMENT_BYTES)) {
    return { ok: false, error: "One of the pages is too large. Please keep each page under 4 MB.", status: 400 };
  }
  if (files.reduce((total, file) => total + file.size, 0) > MAX_REQUEST_BYTES) {
    return { ok: false, error: "Please keep the combined document pages under 4 MB.", status: 400 };
  }
  return null;
}

async function readStoredFiles(
  request: Request,
  userId: string,
): Promise<InputResult> {
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, error: "Secure document analysis is not configured.", status: 503 };
  }
  let body: { analysisMode?: unknown; storedFiles?: unknown } | null;
  try {
    body = await readBoundedJson(request, 64 * 1024) as typeof body;
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return {
      ok: false,
      error: status === 413
        ? "The stored document request is too large."
        : "The stored document reference is invalid.",
      status,
    };
  }
  const references = Array.isArray(body?.storedFiles) ? body.storedFiles.filter(storedReference) : [];
  if (!references.length || references.length > MAX_PAGE_COUNT
    || references.some((file) => !isOwnedStoredDocument(userId, file))) {
    return { ok: false, error: "The stored document reference is invalid.", status: 400 };
  }
  const admin = getSupabaseAdminClient();
  const loaded = await loadBoundedStoredFiles(
    references,
    async (reference) => {
      const result = await admin.storage.from(reference.bucket).info(reference.path);
      return result.error || typeof result.data.size !== "number" ? null : result.data.size;
    },
    async (reference) => {
      const result = await admin.storage.from(reference.bucket).download(reference.path);
      return result.error ? null : result.data;
    },
    {
      maximumFileBytes: MAX_DOCUMENT_BYTES,
      maximumTotalBytes: MAX_REQUEST_BYTES,
    },
  );
  if (!loaded.ok && loaded.reason === "MISSING") {
    return { ok: false, error: "One of the stored document pages could not be loaded.", status: 404 };
  }
  if (!loaded.ok && loaded.reason === "FILE_TOO_LARGE") {
    return { ok: false, error: "One of the pages is too large. Please keep each page under 4 MB.", status: 400 };
  }
  if (!loaded.ok) {
    return { ok: false, error: "Please keep the combined document pages under 4 MB.", status: 413 };
  }
  return { ok: true, analysisMode: getAnalysisMode(body?.analysisMode), files: loaded.files };
}

async function readMultipartFiles(request: Request): Promise<InputResult> {
  let formData: FormData;
  try {
    formData = await readBoundedFormData(
      request,
      MAX_REQUEST_BYTES + MAX_MULTIPART_OVERHEAD,
    );
  } catch (error) {
    const oversized = error instanceof RequestBodyError && error.status === 413;
    return {
      ok: false,
      error: oversized
        ? "Please keep the combined document pages under 4 MB."
        : "The document upload is invalid.",
      status: oversized ? 413 : 400,
    };
  }
  const pages = formData.getAll("files").filter((entry): entry is File => entry instanceof File);
  const legacy = formData.get("file");
  const files = pages.length ? pages : legacy instanceof File ? [legacy] : [];
  const invalid = validateFiles(files);
  return invalid ?? { ok: true, analysisMode: getAnalysisMode(formData.get("analysisMode")), files };
}

export async function readCaptureInput(
  request: Request,
  userId: string,
): Promise<InputResult> {
  const contentType = getRequestMediaType(request);
  const result = contentType === "application/json"
    ? await readStoredFiles(request, userId)
    : contentType === "multipart/form-data"
      ? await readMultipartFiles(request)
      : { ok: false as const, error: "The document upload format is not supported.", status: 415 };
  if (!result.ok) return result;
  return validateFiles(result.files) ?? result;
}
