import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import {
  captureScannerIsRequired,
  getCaptureSecurityScanner,
  inspectCaptureFile,
} from "@/lib/capture/file-security";
import { DOCUMENT_QUARANTINE_BUCKET } from "@/lib/document-upload";
import { authenticateDocumentUploadRequest } from "@/lib/document-upload-auth";
import { parseMobileUploadMetadata, persistedMobileUploadMetadata } from "@/lib/document-upload-metadata";
import {
  DOCUMENT_BUCKET,
  MAX_DOCUMENT_COMMIT_REQUEST_BYTES,
  validateDocumentUpload,
} from "@/lib/document-rules";
import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type CommitBody = { reservationId?: unknown; metadata?: unknown };

type ReservationRecord = {
  id: string;
  user_id: string;
  document_id: string;
  expected_bytes: number;
  quarantine_path: string;
  final_path: string;
  mime_type: string;
  expires_at: string;
  committed_at: string | null;
  cancelled_at: string | null;
};

async function getReservation(userId: string, reservationId: string) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("document_upload_reservations")
    .select("id,user_id,document_id,expected_bytes,quarantine_path,final_path,mime_type,expires_at,committed_at,cancelled_at")
    .eq("id", reservationId)
    .eq("user_id", userId)
    .maybeSingle();
  return error ? null : data as ReservationRecord | null;
}

function fileVersion(path: string) {
  // This is a cache invalidation token, not a security digest.
  return createHash("md5").update(`${DOCUMENT_BUCKET}:${path}`).digest("hex");
}

async function readBody(request: Request) {
  return await readBoundedJson(request, MAX_DOCUMENT_COMMIT_REQUEST_BYTES) as CommitBody;
}

export function OPTIONS(request: Request) {
  return mobilePreflight(request);
}

export async function POST(request: Request) {
  const headers = mobileCorsHeaders(request);
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Secure document upload is unavailable." }, { status: 503, headers });
  }
  const auth = await authenticateDocumentUploadRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return NextResponse.json({ error: "Secure document upload is unavailable." }, { status: 503, headers });
  }
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: "Please sign in again before completing the upload." }, { status: 401, headers });
  }
  const rate = await checkServerRateLimit(createRateLimitKey("document-upload-commit", auth.user.id), {
    limit: 60,
    windowMs: 10 * 60_000,
  });
  if (!rate.allowed) {
    headers.set("Retry-After", String(rate.retryAfterSeconds));
    return NextResponse.json({ error: "Document processing is busy. Try again shortly." }, { status: 429, headers });
  }

  let body: CommitBody;
  try {
    body = await readBody(request);
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return NextResponse.json({ error: "The upload request is invalid." }, { status, headers });
  }
  const reservationId = typeof body?.reservationId === "string" ? body.reservationId : "";
  let metadata;
  try {
    metadata = parseMobileUploadMetadata(body?.metadata);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The document details are invalid." }, { status: 400, headers });
  }
  const reservation = await getReservation(auth.user.id, reservationId);
  if (reservation?.committed_at) {
    return NextResponse.json({
      bucket: DOCUMENT_BUCKET,
      documentId: reservation.document_id,
      fileVersion: fileVersion(reservation.final_path),
      path: reservation.final_path,
    }, { headers });
  }
  if (
    !reservation || reservation.cancelled_at ||
    new Date(reservation.expires_at).getTime() <= Date.now()
  ) {
    return NextResponse.json({ error: "This secure upload has expired. Please choose the document again." }, { status: 409, headers });
  }

  const admin = getSupabaseAdminClient();
  const { data: quarantinedFile, error: downloadError } = await admin.storage
    .from(DOCUMENT_QUARANTINE_BUCKET)
    .download(reservation.quarantine_path);
  if (downloadError || !quarantinedFile) {
    return NextResponse.json({ error: "The uploaded document could not be found. Please try again." }, { status: 409, headers });
  }

  const bytes = new Uint8Array(await quarantinedFile.arrayBuffer());
  const validationError = validateDocumentUpload({ type: reservation.mime_type, size: bytes.byteLength });
  const inspection = validationError ? null : inspectCaptureFile({ declaredMimeType: reservation.mime_type, bytes });
  if (validationError || !inspection?.ok || bytes.byteLength !== Number(reservation.expected_bytes)) {
    await Promise.all([
      admin.storage.from(DOCUMENT_QUARANTINE_BUCKET).remove([reservation.quarantine_path]),
      admin.rpc("finish_document_upload", {
        input_user_id: auth.user.id,
        input_reservation_id: reservation.id,
        input_commit: false,
      }),
    ]);
    return NextResponse.json({ error: validationError ?? (!inspection?.ok ? inspection?.error : "The uploaded file size changed unexpectedly.") }, { status: 400, headers });
  }

  const scanResult = await getCaptureSecurityScanner().scan([
    { bytes, mimeType: inspection.detectedMimeType },
  ]);
  if (scanResult.status === "BLOCKED" || (captureScannerIsRequired() && scanResult.status !== "PASSED")) {
    await Promise.all([
      admin.storage.from(DOCUMENT_QUARANTINE_BUCKET).remove([reservation.quarantine_path]),
      admin.rpc("finish_document_upload", {
        input_user_id: auth.user.id,
        input_reservation_id: reservation.id,
        input_commit: false,
      }),
    ]);
    return NextResponse.json({ error: "This document could not pass the configured security check." }, { status: 422, headers });
  }

  const { error: uploadError } = await admin.storage
    .from(DOCUMENT_BUCKET)
    .upload(reservation.final_path, bytes, {
      contentType: inspection.detectedMimeType,
      upsert: false,
    });
  if (uploadError) {
    const duplicate = /already exists|duplicate|conflict/i.test(uploadError.message);
    const { data: existingFile } = duplicate
      ? await admin.storage.from(DOCUMENT_BUCKET).download(reservation.final_path)
      : { data: null };
    const existingBytes = existingFile ? new Uint8Array(await existingFile.arrayBuffer()) : null;
    if (!existingBytes || existingBytes.byteLength !== bytes.byteLength || !Buffer.from(existingBytes).equals(Buffer.from(bytes))) {
      return NextResponse.json({ error: "DiaryDock could not finish storing this document. Please try again." }, { status: 503, headers });
    }
  }

  const completion = metadata
    ? await admin.rpc("commit_mobile_document_upload", {
        input_user_id: auth.user.id,
        input_reservation_id: reservation.id,
        input_metadata: persistedMobileUploadMetadata(metadata),
      })
    : await admin.rpc("finish_document_upload", {
        input_user_id: auth.user.id,
        input_reservation_id: reservation.id,
        input_commit: true,
      });
  const { data: finished, error: finishError } = completion;
  if (finishError || finished !== true) {
    await admin.storage.from(DOCUMENT_BUCKET).remove([reservation.final_path]);
    return NextResponse.json({ error: "DiaryDock could not confirm this upload. Please try again." }, { status: 503, headers });
  }

  await admin.storage.from(DOCUMENT_QUARANTINE_BUCKET).remove([reservation.quarantine_path]);
  return NextResponse.json({
    bucket: DOCUMENT_BUCKET,
    documentId: reservation.document_id,
    fileVersion: fileVersion(reservation.final_path),
    path: reservation.final_path,
    mimeType: inspection.detectedMimeType,
    securityScanStatus: scanResult.status,
  }, { headers });
}

export async function DELETE(request: Request) {
  const headers = mobileCorsHeaders(request);
  if (!isSupabaseAdminConfigured()) return NextResponse.json({ error: "Secure document upload is unavailable." }, { status: 503, headers });
  const auth = await authenticateDocumentUploadRequest(request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401, headers });
  let body: CommitBody;
  try {
    body = await readBody(request);
  } catch {
    return NextResponse.json({ error: "The upload request is invalid." }, { status: 400, headers });
  }
  const reservationId = typeof body?.reservationId === "string" ? body.reservationId : "";
  const reservation = await getReservation(auth.user.id, reservationId);
  if (!reservation) return NextResponse.json({ cancelled: true }, { headers });

  const admin = getSupabaseAdminClient();
  await Promise.all([
    admin.storage.from(DOCUMENT_QUARANTINE_BUCKET).remove([reservation.quarantine_path]),
    admin.rpc("finish_document_upload", {
      input_user_id: auth.user.id,
      input_reservation_id: reservation.id,
      input_commit: false,
    }),
  ]);
  return NextResponse.json({ cancelled: true }, { headers });
}
