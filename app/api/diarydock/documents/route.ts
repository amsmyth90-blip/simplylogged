import { NextResponse } from "next/server";

import { DOCUMENT_BUCKET } from "@/lib/document-rules";
import { isOwnedDocumentStoragePath } from "@/lib/document-upload";
import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { RequestObservation } from "@/lib/observability/request-observation";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import {
  MAX_STRUCTURED_DOCUMENT_BYTES,
  parseStructuredDocumentDelete,
  parseStructuredDocumentMutation,
  type StructuredDocumentInput,
} from "@/lib/structured-document-contract";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ExistingDocument = {
  kind: string;
  size_label: string;
  storage_bucket: string | null;
  storage_path: string | null;
  user_id: string;
};

type UploadReservation = { final_path: string; mime_type: string };

type DeleteResult = {
  cleanup_id: string | null;
  status: "DELETED" | "NOT_FOUND";
  storage_bucket: string | null;
  storage_path: string | null;
};

function respond(
  observation: RequestObservation,
  body: unknown,
  status: number,
  outcome: string,
) {
  const headers = new Headers({
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  });
  observation.finish(headers, { outcome, status });
  return NextResponse.json(body, { status, headers });
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

async function authorize(request: Request, operation: string, limit: number) {
  const observation = new RequestObservation({
    operation, request, route: "/api/diarydock/documents",
  });
  if (!sameOrigin(request)) {
    return { response: respond(observation, { error: "Request origin was not accepted." }, 403, "invalid-origin") };
  }
  if (!isSupabaseConfiguredServer()) {
    return { response: respond(observation, { error: "Secure documents are unavailable." }, 503, "auth-unavailable") };
  }
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { response: respond(observation, { error: "Please sign in again." }, 401, "unauthenticated") };
  }
  const rate = await checkServerRateLimit(
    createRateLimitKey(`desktop:documents:${operation}`, data.user.id),
    { limit, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) {
    return { response: respond(observation, { error: "Please wait before changing documents again." }, 429, "rate-limited") };
  }
  if (!isSupabaseAdminConfigured()) {
    return { response: respond(observation, { error: "Secure documents are unavailable." }, 503, "admin-unavailable") };
  }
  return { observation, userId: data.user.id };
}

function mutableRow(input: StructuredDocumentInput) {
  return {
    action_items: input.actionItems,
    category: input.category,
    confidence: input.confidence,
    due_date: input.dueDate,
    emergency_visible: input.emergencyVisible,
    extracted_text: input.extractedText,
    extraction_summary: input.extractionSummary,
    issuer: input.issuer,
    mime_type: input.mimeType,
    original_file_name: input.originalFileName,
    review_reasons: input.reviewReasons,
    review_status: input.reviewStatus,
    reviewed_at: input.reviewedAt,
    room_id: input.roomId,
    room_name: input.roomName,
    title: input.title,
  };
}

export async function POST(request: Request) {
  const auth = await authorize(request, "write", 90);
  if (auth.response) return auth.response;
  let input: StructuredDocumentInput;
  try {
    input = parseStructuredDocumentMutation(
      await readBoundedJson(request, MAX_STRUCTURED_DOCUMENT_BYTES),
    );
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return respond(auth.observation, { error: "That document update was not valid." }, status, "invalid-body");
  }
  const admin = getSupabaseAdminClient();
  const existing = await admin.from("documents")
    .select("user_id,kind,size_label,storage_bucket,storage_path")
    .eq("id", input.id).maybeSingle<ExistingDocument>();
  if (existing.error) {
    return respond(auth.observation, { error: "DiaryDock could not save this document." }, 503, "database-unavailable");
  }
  if (existing.data && existing.data.user_id !== auth.userId) {
    return respond(auth.observation, { error: "Document not found." }, 404, "not-owner");
  }
  if (existing.data
    && (existing.data.kind !== input.kind || existing.data.size_label !== input.size
      || existing.data.storage_bucket !== input.storageBucket
      || existing.data.storage_path !== input.storagePath)) {
    return respond(auth.observation, { error: "Refresh this document before changing it." }, 409, "immutable-conflict");
  }
  let reservation: UploadReservation | null = null;
  if (!existing.data && (input.storageBucket || input.storagePath)) {
    if (input.storageBucket !== DOCUMENT_BUCKET || !input.storagePath
      || !isOwnedDocumentStoragePath(auth.userId, input.id, input.storagePath)) {
      return respond(auth.observation, { error: "The document upload proof was invalid." }, 400, "invalid-upload-proof");
    }
    const proof = await admin.from("document_upload_reservations")
      .select("final_path,mime_type")
      .eq("user_id", auth.userId).eq("document_id", input.id)
      .eq("final_path", input.storagePath).not("committed_at", "is", null)
      .is("cancelled_at", null).maybeSingle<UploadReservation>();
    if (proof.error || !proof.data) {
      return respond(auth.observation, { error: "The document upload proof was invalid." }, 400, "invalid-upload-proof");
    }
    reservation = proof.data;
  }
  const write = existing.data
    ? await admin.from("documents").update(mutableRow(input))
      .eq("id", input.id).eq("user_id", auth.userId).select("id").maybeSingle()
    : await admin.from("documents").insert({
      ...mutableRow(input), id: input.id, kind: input.kind,
      mime_type: reservation?.mime_type ?? input.mimeType,
      shared_with: [], size_label: input.size, user_id: auth.userId,
      storage_bucket: reservation ? DOCUMENT_BUCKET : null,
      storage_path: reservation?.final_path ?? null,
    }).select("id").maybeSingle();
  if (write.error || !write.data) {
    return respond(auth.observation, { error: "DiaryDock could not save this document." }, 409, "write-conflict");
  }
  return respond(auth.observation, { status: "OK" }, 200, "ok");
}

export async function DELETE(request: Request) {
  const auth = await authorize(request, "delete", 30);
  if (auth.response) return auth.response;
  let documentId: string;
  try {
    documentId = parseStructuredDocumentDelete(
      await readBoundedJson(request, 2 * 1024),
    );
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return respond(auth.observation, { error: "That document deletion was not valid." }, status, "invalid-body");
  }
  const admin = getSupabaseAdminClient();
  const deletion = await admin.rpc("delete_diarydock_document", {
    input_document_id: documentId, input_user_id: auth.userId,
  }).maybeSingle<DeleteResult>();
  if (deletion.error || !deletion.data) {
    return respond(auth.observation, { error: "DiaryDock could not delete this document." }, 503, "database-unavailable");
  }
  if (deletion.data.status === "NOT_FOUND") {
    return respond(auth.observation, { error: "Document not found." }, 404, "not-found");
  }
  const bucket = deletion.data.storage_bucket;
  const path = deletion.data.storage_path;
  if (bucket && path) {
    if (bucket !== DOCUMENT_BUCKET || !isOwnedDocumentStoragePath(auth.userId, documentId, path)) {
      return respond(auth.observation, { error: "DiaryDock found invalid document storage metadata." }, 503, "invalid-storage-reference");
    }
    const removal = await admin.storage.from(bucket).remove([path]);
    if (removal.error) {
      return respond(auth.observation, { status: "OK", cleanupPending: true }, 200, "cleanup-pending");
    }
  }
  if (deletion.data.cleanup_id) {
    await admin.from("document_storage_cleanup_jobs")
      .delete().eq("id", deletion.data.cleanup_id).eq("owner_id", auth.userId);
  }
  return respond(auth.observation, { status: "OK", cleanupPending: false }, 200, "ok");
}
