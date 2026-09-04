import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { inspectCaptureFile } from "@/lib/capture/file-security";
import { isOwnedDocumentStoragePath, validateDocumentId } from "@/lib/document-upload";
import {
  DOCUMENT_BUCKET,
  MAX_DOCUMENT_BYTES,
  sanitizeDocumentFileName,
  validateDocumentUpload,
} from "@/lib/document-rules";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { authenticateApiRequest } from "@/lib/supabase/request";

export const runtime = "nodejs";

export function OPTIONS(request: Request) {
  return mobilePreflight(request);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ documentId: string }> },
) {
  const headers = mobileCorsHeaders(request);
  const { documentId } = await context.params;
  if (!validateDocumentId(documentId)) {
    return NextResponse.json({ error: "The document identifier is invalid." }, { status: 400, headers });
  }
  const auth = await authenticateApiRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return NextResponse.json({ error: "Secure documents are unavailable." }, { status: 503, headers });
  }
  if (auth.error || !auth.user || !auth.supabase) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401, headers });
  }
  const rate = await checkServerRateLimit(createRateLimitKey("documents:file", auth.user.id), {
    limit: 60,
    windowMs: 5 * 60_000,
  });
  if (!rate.allowed) {
    headers.set("Retry-After", String(rate.retryAfterSeconds));
    return NextResponse.json({ error: "File access is busy. Try again shortly." }, { status: 429, headers });
  }

  const { data: document, error } = await auth.supabase
    .from("documents")
    .select("id,user_id,storage_bucket,storage_path,mime_type,original_file_name")
    .eq("id", documentId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: "The file could not be opened." }, { status: 503, headers });
  }
  if (!document?.storage_bucket || !document.storage_path) {
    return NextResponse.json({ error: "This file is not available." }, { status: 404, headers });
  }
  const bucket = String(document.storage_bucket);
  const path = String(document.storage_path);
  if (bucket !== DOCUMENT_BUCKET || !isOwnedDocumentStoragePath(auth.user.id, documentId, path)) {
    return NextResponse.json({ error: "This file is not available." }, { status: 404, headers });
  }

  const downloaded = await auth.supabase.storage.from(bucket).download(path);
  if (downloaded.error || !downloaded.data) {
    return NextResponse.json({ error: "The file could not be opened." }, { status: 503, headers });
  }
  const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
  const declaredType = String(document.mime_type || downloaded.data.type || "").toLowerCase();
  const validationError = validateDocumentUpload({ type: declaredType, size: bytes.byteLength });
  const inspected = validationError ? null : inspectCaptureFile({ declaredMimeType: declaredType, bytes });
  if (validationError || !inspected?.ok || bytes.byteLength > MAX_DOCUMENT_BYTES) {
    return NextResponse.json({ error: "The stored file failed a security check." }, { status: 422, headers });
  }

  const fileName = sanitizeDocumentFileName(String(document.original_file_name || path.split("/").pop()));
  headers.set("Content-Disposition", `inline; filename="${fileName}"`);
  headers.set("Content-Length", String(bytes.byteLength));
  headers.set("Content-Type", inspected.detectedMimeType);
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-SHA256", createHash("sha256").update(bytes).digest("hex"));
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(bytes, { status: 200, headers });
}
