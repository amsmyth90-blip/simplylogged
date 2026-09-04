import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { inspectCaptureFile } from "@/lib/capture/file-security";
import {
  DOCUMENT_BUCKET,
  MAX_DOCUMENT_BYTES,
  sanitizeDocumentFileName,
  validateDocumentUpload,
} from "@/lib/document-rules";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { RequestObservation } from "@/lib/observability/request-observation";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { authenticateApiRequest } from "@/lib/supabase/request";

export const runtime = "nodejs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function OPTIONS(request: Request) {
  return mobilePreflight(request);
}

function errorResponse(
  request: Request,
  observation: RequestObservation,
  message: string,
  status: number,
  outcome: string,
) {
  const headers = mobileCorsHeaders(request);
  headers.set("X-Content-Type-Options", "nosniff");
  observation.finish(headers, { outcome, status });
  return NextResponse.json({ error: message }, { status, headers });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ grantId: string }> },
) {
  const observation = new RequestObservation({
    operation: "mobile-emergency-shared-file",
    request,
    route: "/api/mobile/emergency-access/files/[grantId]",
  });
  const { grantId } = await context.params;
  if (!uuidPattern.test(grantId)) {
    return errorResponse(request, observation, "The shared document is unavailable.", 400, "invalid-id");
  }
  const auth = await authenticateApiRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return errorResponse(request, observation, "Shared documents are unavailable.", 503, "auth-unavailable");
  }
  if (auth.error || !auth.user || !auth.supabase) {
    return errorResponse(request, observation, "Please sign in again to open this document.", 401, "unauthenticated");
  }
  const rate = await checkServerRateLimit(
    createRateLimitKey("mobile:emergency-access:file", auth.user.id),
    { limit: 30, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) {
    return errorResponse(request, observation, "File access is busy. Try again shortly.", 429, "rate-limited");
  }
  const locationResult = await auth.supabase.rpc("get_emergency_document_location", {
    input_grant_id: grantId,
  });
  const location = Array.isArray(locationResult.data)
    ? locationResult.data[0]
    : locationResult.data;
  if (locationResult.error || !location?.bucket || !location?.path
    || String(location.bucket) !== DOCUMENT_BUCKET) {
    return errorResponse(request, observation, "The shared document is unavailable.", 404, "not-found");
  }
  const downloaded = await auth.supabase.storage
    .from(DOCUMENT_BUCKET).download(String(location.path));
  if (downloaded.error || !downloaded.data) {
    return errorResponse(request, observation, "The shared document could not be opened.", 503, "storage-unavailable");
  }
  const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
  const declaredType = downloaded.data.type.toLowerCase();
  const validationError = validateDocumentUpload({ type: declaredType, size: bytes.byteLength });
  const inspected = validationError ? null : inspectCaptureFile({ declaredMimeType: declaredType, bytes });
  if (validationError || !inspected?.ok || bytes.byteLength > MAX_DOCUMENT_BYTES) {
    return errorResponse(request, observation, "The shared document failed a security check.", 422, "invalid-file");
  }
  const headers = mobileCorsHeaders(request);
  headers.set("Content-Disposition", `inline; filename="${sanitizeDocumentFileName(String(location.title || "emergency-document"))}"`);
  headers.set("Content-Length", String(bytes.byteLength));
  headers.set("Content-Type", inspected.detectedMimeType);
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-SHA256", createHash("sha256").update(bytes).digest("hex"));
  headers.set("X-Content-Type-Options", "nosniff");
  observation.finish(headers, { outcome: "ok", records: 1, status: 200 });
  return new Response(bytes, { status: 200, headers });
}
