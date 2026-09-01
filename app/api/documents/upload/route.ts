import { NextResponse } from "next/server";

import {
  captureScannerIsRequired,
  getCaptureSecurityScanner,
  inspectCaptureFile,
} from "@/lib/capture/file-security";
import {
  DOCUMENT_BUCKET,
  MAX_DOCUMENT_BYTES,
  sanitizeDocumentFileName,
  validateDocumentUpload,
} from "@/lib/document-rules";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function readBoundedBody(request: Request) {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_DOCUMENT_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function POST(request: Request) {
  if (!isSupabaseConfiguredServer() || !isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Secure document upload is not configured." }, { status: 503 });
  }

  const supabase = await getSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Please sign in again before uploading a document." }, { status: 401 });
  }

  const rateLimit = await checkServerRateLimit(
    createRateLimitKey("document-upload", authData.user.id),
    { limit: 30, windowMs: 10 * 60 * 1000 },
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many document uploads. Please wait and try again." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const documentId = request.headers.get("x-diarydock-document-id")?.trim() ?? "";
  const declaredMimeType = request.headers.get("content-type")?.split(";", 1)[0]?.trim() ?? "";
  const encodedName = request.headers.get("x-diarydock-file-name") ?? "document";
  let originalName = "document";
  try {
    originalName = decodeURIComponent(encodedName);
  } catch {
    return NextResponse.json({ error: "The document filename is invalid." }, { status: 400 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!uuidPattern.test(documentId) || !Number.isFinite(contentLength) || contentLength > MAX_DOCUMENT_BYTES) {
    return NextResponse.json({ error: "The document upload is invalid or too large." }, { status: 400 });
  }

  const bytes = await readBoundedBody(request);
  const validationError = validateDocumentUpload({ type: declaredMimeType, size: bytes?.byteLength ?? 0 });
  if (!bytes || validationError) {
    return NextResponse.json({ error: validationError ?? "The document is too large." }, { status: 400 });
  }

  const inspection = inspectCaptureFile({ declaredMimeType, bytes });
  if (!inspection.ok) {
    return NextResponse.json({ error: inspection.error }, { status: 400 });
  }

  const scanResult = await getCaptureSecurityScanner().scan([
    { bytes, mimeType: inspection.detectedMimeType },
  ]);
  if (scanResult.status === "BLOCKED" || (captureScannerIsRequired() && scanResult.status !== "PASSED")) {
    return NextResponse.json({ error: "This document could not pass the configured security check." }, { status: 422 });
  }

  const safeName = sanitizeDocumentFileName(originalName);
  const storagePath = `${authData.user.id}/${documentId}/${safeName}`;
  const { error: uploadError } = await getSupabaseAdminClient().storage
    .from(DOCUMENT_BUCKET)
    .upload(storagePath, bytes, { contentType: inspection.detectedMimeType, upsert: false });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  return NextResponse.json({
    bucket: DOCUMENT_BUCKET,
    path: storagePath,
    mimeType: inspection.detectedMimeType,
    securityScanStatus: scanResult.status,
  });
}
