import { NextResponse } from "next/server";

import { inspectCaptureFile } from "@/lib/capture/file-security";
import {
  DOCUMENT_BUCKET,
  MAX_DOCUMENT_BYTES,
  sanitizeDocumentFileName,
  validateDocumentUpload,
} from "@/lib/document-rules";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: { params: Promise<{ grantId: string }> }) {
  if (!isSupabaseConfiguredServer()) return NextResponse.redirect(new URL("/emergency/shared", _request.url));
  const { grantId } = await context.params;
  if (!uuidPattern.test(grantId)) return NextResponse.redirect(new URL("/emergency/shared", _request.url));
  const supabase = await getSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return NextResponse.redirect(new URL("/login", _request.url));
  const { data, error } = await supabase.rpc("get_emergency_document_location", { input_grant_id: grantId });
  const location = Array.isArray(data) ? data[0] : data;
  if (error || !location?.bucket || !location?.path || String(location.bucket) !== DOCUMENT_BUCKET) {
    return NextResponse.redirect(new URL("/emergency/shared", _request.url));
  }
  const downloaded = await supabase.storage.from(DOCUMENT_BUCKET).download(String(location.path));
  if (downloaded.error || !downloaded.data) return NextResponse.redirect(new URL("/emergency/shared", _request.url));
  // Serve only bytes that still match a permitted document type, as the mobile route does.
  const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
  const declaredType = downloaded.data.type.toLowerCase();
  const validationError = validateDocumentUpload({ type: declaredType, size: bytes.byteLength });
  const inspected = validationError ? null : inspectCaptureFile({ declaredMimeType: declaredType, bytes });
  if (validationError || !inspected?.ok || bytes.byteLength > MAX_DOCUMENT_BYTES) {
    return NextResponse.redirect(new URL("/emergency/shared", _request.url));
  }
  const safeTitle = sanitizeDocumentFileName(String(location.title || "emergency-document"));
  return new NextResponse(bytes, { status: 200, headers: { "Cache-Control": "private, no-store, max-age=0", "Content-Type": inspected.detectedMimeType, "Content-Disposition": `inline; filename="${safeTitle}"`, "Content-Length": String(bytes.byteLength), "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" } });
}
