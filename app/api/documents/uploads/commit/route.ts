import { NextResponse } from "next/server";

import {
  captureScannerIsRequired,
  getCaptureSecurityScanner,
  inspectCaptureFile,
} from "@/lib/capture/file-security";
import { DOCUMENT_QUARANTINE_BUCKET } from "@/lib/document-upload";
import { DOCUMENT_BUCKET, validateDocumentUpload } from "@/lib/document-rules";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

type CommitBody = { reservationId?: unknown };

type ReservationRecord = {
  id: string;
  user_id: string;
  expected_bytes: number;
  quarantine_path: string;
  final_path: string;
  mime_type: string;
  expires_at: string;
  committed_at: string | null;
  cancelled_at: string | null;
};

async function authenticate() {
  if (!isSupabaseConfiguredServer() || !isSupabaseAdminConfigured()) return null;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  return error || !data.user ? null : data.user;
}

async function getReservation(userId: string, reservationId: string) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("document_upload_reservations")
    .select("id,user_id,expected_bytes,quarantine_path,final_path,mime_type,expires_at,committed_at,cancelled_at")
    .eq("id", reservationId)
    .eq("user_id", userId)
    .maybeSingle();
  return error ? null : data as ReservationRecord | null;
}

export async function POST(request: Request) {
  const user = await authenticate();
  if (!user) {
    return NextResponse.json({ error: "Please sign in again before completing the upload." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as CommitBody | null;
  const reservationId = typeof body?.reservationId === "string" ? body.reservationId : "";
  const reservation = await getReservation(user.id, reservationId);
  if (reservation?.committed_at) {
    return NextResponse.json({ bucket: DOCUMENT_BUCKET, path: reservation.final_path });
  }
  if (
    !reservation || reservation.cancelled_at ||
    new Date(reservation.expires_at).getTime() <= Date.now()
  ) {
    return NextResponse.json({ error: "This secure upload has expired. Please choose the document again." }, { status: 409 });
  }

  const admin = getSupabaseAdminClient();
  const { data: quarantinedFile, error: downloadError } = await admin.storage
    .from(DOCUMENT_QUARANTINE_BUCKET)
    .download(reservation.quarantine_path);
  if (downloadError || !quarantinedFile) {
    return NextResponse.json({ error: "The uploaded document could not be found. Please try again." }, { status: 409 });
  }

  const bytes = new Uint8Array(await quarantinedFile.arrayBuffer());
  const validationError = validateDocumentUpload({ type: reservation.mime_type, size: bytes.byteLength });
  const inspection = validationError ? null : inspectCaptureFile({ declaredMimeType: reservation.mime_type, bytes });
  if (validationError || !inspection?.ok || bytes.byteLength !== Number(reservation.expected_bytes)) {
    await Promise.all([
      admin.storage.from(DOCUMENT_QUARANTINE_BUCKET).remove([reservation.quarantine_path]),
      admin.rpc("finish_document_upload", {
        input_user_id: user.id,
        input_reservation_id: reservation.id,
        input_commit: false,
      }),
    ]);
    return NextResponse.json({ error: validationError ?? (!inspection?.ok ? inspection?.error : "The uploaded file size changed unexpectedly.") }, { status: 400 });
  }

  const scanResult = await getCaptureSecurityScanner().scan([
    { bytes, mimeType: inspection.detectedMimeType },
  ]);
  if (scanResult.status === "BLOCKED" || (captureScannerIsRequired() && scanResult.status !== "PASSED")) {
    await Promise.all([
      admin.storage.from(DOCUMENT_QUARANTINE_BUCKET).remove([reservation.quarantine_path]),
      admin.rpc("finish_document_upload", {
        input_user_id: user.id,
        input_reservation_id: reservation.id,
        input_commit: false,
      }),
    ]);
    return NextResponse.json({ error: "This document could not pass the configured security check." }, { status: 422 });
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
      return NextResponse.json({ error: "DiaryDock could not finish storing this document. Please try again." }, { status: 503 });
    }
  }

  const { data: finished, error: finishError } = await admin.rpc("finish_document_upload", {
    input_user_id: user.id,
    input_reservation_id: reservation.id,
    input_commit: true,
  });
  if (finishError || finished !== true) {
    await admin.storage.from(DOCUMENT_BUCKET).remove([reservation.final_path]);
    return NextResponse.json({ error: "DiaryDock could not confirm this upload. Please try again." }, { status: 503 });
  }

  await admin.storage.from(DOCUMENT_QUARANTINE_BUCKET).remove([reservation.quarantine_path]);
  return NextResponse.json({
    bucket: DOCUMENT_BUCKET,
    path: reservation.final_path,
    mimeType: inspection.detectedMimeType,
    securityScanStatus: scanResult.status,
  });
}

export async function DELETE(request: Request) {
  const user = await authenticate();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as CommitBody | null;
  const reservationId = typeof body?.reservationId === "string" ? body.reservationId : "";
  const reservation = await getReservation(user.id, reservationId);
  if (!reservation) return NextResponse.json({ cancelled: true });

  const admin = getSupabaseAdminClient();
  await Promise.all([
    admin.storage.from(DOCUMENT_QUARANTINE_BUCKET).remove([reservation.quarantine_path]),
    admin.rpc("finish_document_upload", {
      input_user_id: user.id,
      input_reservation_id: reservation.id,
      input_commit: false,
    }),
  ]);
  return NextResponse.json({ cancelled: true });
}
