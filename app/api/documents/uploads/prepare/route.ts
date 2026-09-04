import { NextResponse } from "next/server";

import {
  DOCUMENT_QUARANTINE_BUCKET,
  validatePreparedUpload,
} from "@/lib/document-upload";
import { authenticateDocumentUploadRequest } from "@/lib/document-upload-auth";
import { sanitizeDocumentFileName } from "@/lib/document-rules";
import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export function OPTIONS(request: Request) {
  return mobilePreflight(request);
}

type PrepareBody = {
  documentId?: unknown;
  fileName?: unknown;
  mimeType?: unknown;
  size?: unknown;
};

type ReservationRow = {
  reservation_id: string;
  quarantine_path: string;
  final_path: string;
  used_bytes: number;
  reserved_bytes: number;
  storage_limit_bytes: number;
};

export async function POST(request: Request) {
  const headers = mobileCorsHeaders(request);
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Secure document upload is not configured." }, { status: 503, headers });
  }

  const auth = await authenticateDocumentUploadRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return NextResponse.json({ error: "Secure document upload is unavailable." }, { status: 503, headers });
  }
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: "Please sign in again before uploading a document." }, { status: 401, headers });
  }

  const rateLimit = await checkServerRateLimit(
    createRateLimitKey("document-upload-prepare", auth.user.id),
    { limit: 30, windowMs: 10 * 60 * 1000 },
  );
  if (!rateLimit.allowed) {
    headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    return NextResponse.json(
      { error: "Too many document uploads. Please wait and try again." },
      { status: 429, headers },
    );
  }

  let body: PrepareBody | null;
  try {
    body = await readBoundedJson(request, 16 * 1024) as PrepareBody;
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return NextResponse.json({ error: "The upload request is invalid." }, { status, headers });
  }
  const input = {
    documentId: typeof body?.documentId === "string" ? body.documentId : "",
    fileName: typeof body?.fileName === "string" ? body.fileName : "",
    mimeType: typeof body?.mimeType === "string" ? body.mimeType : "",
    size: typeof body?.size === "number" ? body.size : Number.NaN,
  };
  const validationError = validatePreparedUpload(input);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400, headers });
  }

  const admin = getSupabaseAdminClient();
  const safeName = sanitizeDocumentFileName(input.fileName);
  const { data: reservationData, error: reservationError } = await admin.rpc("reserve_document_upload", {
    input_user_id: auth.user.id,
    input_document_id: input.documentId,
    input_safe_name: safeName,
    input_mime_type: input.mimeType,
    input_expected_bytes: input.size,
  });

  if (reservationError) {
    const storageLimitExceeded = reservationError.message.includes("STORAGE_LIMIT_EXCEEDED");
    return NextResponse.json(
      {
        error: storageLimitExceeded
          ? "You have reached your DiaryDock storage allowance. Remove an old document or add more storage before uploading."
          : "DiaryDock could not reserve secure storage for this document.",
        code: storageLimitExceeded ? "STORAGE_LIMIT_EXCEEDED" : "RESERVATION_FAILED",
      },
      { status: storageLimitExceeded ? 413 : 503, headers },
    );
  }

  const reservation = (Array.isArray(reservationData) ? reservationData[0] : reservationData) as ReservationRow | null;
  if (!reservation?.reservation_id || !reservation.quarantine_path) {
    return NextResponse.json({ error: "DiaryDock could not reserve secure storage for this document." }, { status: 503, headers });
  }

  const { data: signedUpload, error: signedUploadError } = await admin.storage
    .from(DOCUMENT_QUARANTINE_BUCKET)
    .createSignedUploadUrl(reservation.quarantine_path, { upsert: false });

  if (signedUploadError || !signedUpload?.token) {
    await admin.rpc("finish_document_upload", {
      input_user_id: auth.user.id,
      input_reservation_id: reservation.reservation_id,
      input_commit: false,
    });
    return NextResponse.json({ error: "DiaryDock could not open a secure upload channel." }, { status: 503, headers });
  }

  return NextResponse.json({
    reservationId: reservation.reservation_id,
    bucket: DOCUMENT_QUARANTINE_BUCKET,
    path: reservation.quarantine_path,
    token: signedUpload.token,
    storage: {
      usedBytes: Number(reservation.used_bytes),
      reservedBytes: Number(reservation.reserved_bytes),
      limitBytes: Number(reservation.storage_limit_bytes),
    },
  }, { headers });
}
