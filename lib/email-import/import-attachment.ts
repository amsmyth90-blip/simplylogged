import { captureScannerIsRequired, getCaptureSecurityScanner, inspectCaptureFile } from "@/lib/capture/file-security";
import { DOCUMENT_BUCKET, isAcceptedDocumentType, sanitizeDocumentFileName, validateDocumentUpload } from "@/lib/document-rules";
import { categoryFromText, documentIdForInboundAttachment, isDuplicateError, isMissingOptionalTableError, kindFromMimeType, titleFromFileName } from "@/lib/email-import/attachment-identity";
import type { InboundAttachment } from "@/lib/email-import/payload";
import { createLifeInboxFingerprint } from "@/lib/life-inbox/dedupe";
import { suggestFilingDestination } from "@/lib/life-inbox/suggestions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export class EmailImportFailure extends Error {}

export type AttachmentImportResult =
  | { status: "saved"; item: { id: string; title: string } }
  | { status: "duplicate"; item: { id: string; title: string } }
  | { status: "storage-limit"; item: { title: string } }
  | { status: "unsupported" };

export async function importInboundAttachment(input: {
  attachment: InboundAttachment;
  recipientText: string;
  sender: string;
  subject: string;
  userId: string;
}): Promise<AttachmentImportResult> {
  const { attachment, recipientText, sender, subject, userId } = input;
  const validationError = validateDocumentUpload({ type: attachment.mimeType, size: attachment.size });
  if (validationError || !isAcceptedDocumentType(attachment.mimeType)) return { status: "unsupported" };
  const bytes = new Uint8Array(attachment.bytes);
  const inspection = inspectCaptureFile({ declaredMimeType: attachment.mimeType, bytes });
  if (!inspection.ok) return { status: "unsupported" };
  const scanResult = await getCaptureSecurityScanner().scan([{ bytes, mimeType: inspection.detectedMimeType }]);
  if (scanResult.status === "BLOCKED" || (captureScannerIsRequired() && scanResult.status !== "PASSED")) return { status: "unsupported" };

  const supabase = getSupabaseAdminClient();
  const mimeType = inspection.detectedMimeType;
  const safeName = sanitizeDocumentFileName(attachment.name) || "forwarded-attachment";
  const title = subject || titleFromFileName(attachment.name) || "Forwarded document";
  const sizeLabel = `${Math.max(1, Math.round(attachment.size / 1024))} KB`;
  const category = categoryFromText(`${subject} ${attachment.name}`);
  const filingSuggestion = suggestFilingDestination({
    title,
    category,
    issuer: sender,
    originalFileName: attachment.name,
    extractionSummary: "Forwarded into DiaryDock by email. Please review the details before relying on them.",
    roomId: "mailbox",
    roomName: "Mailbox"
  });
  const documentId = documentIdForInboundAttachment({ userId, recipientText, subject, sender, attachment });
  const fingerprint = createLifeInboxFingerprint({
    userId,
    sourceType: "email",
    sourceId: attachment.sourceEmailId ? `${attachment.sourceEmailId}:${attachment.sourceAttachmentId ?? attachment.name}` : `${recipientText}:${sender}:${subject}`,
    title,
    fileName: attachment.name,
    mimeType,
    size: attachment.size
  });

  const { data: existingDocument, error: existingDocumentError } = await supabase.from("documents").select("id,title").eq("user_id", userId).eq("id", documentId).maybeSingle();
  if (existingDocumentError) throw new EmailImportFailure("DiaryDock could not check for duplicate forwarded files.");
  if (existingDocument) return { status: "duplicate", item: { id: existingDocument.id, title: existingDocument.title ?? title } };

  const { data: existingInboxItem, error: existingInboxError } = await supabase.from("life_inbox_items").select("id,document_id,title").eq("user_id", userId).eq("fingerprint", fingerprint).maybeSingle();
  if (existingInboxError && !isMissingOptionalTableError(existingInboxError)) throw new EmailImportFailure("DiaryDock could not check the import inbox for duplicate forwarded files.");
  if (existingInboxItem?.document_id) return { status: "duplicate", item: { id: existingInboxItem.document_id, title: existingInboxItem.title ?? title } };

  const { data: matchingDocument, error: matchingError } = await supabase.from("documents").select("id,title").eq("user_id", userId).eq("issuer", sender).eq("title", title).eq("original_file_name", attachment.name).eq("mime_type", mimeType).eq("size_label", sizeLabel).limit(1).maybeSingle();
  if (matchingError) throw new EmailImportFailure("DiaryDock could not check for duplicate forwarded files.");
  if (matchingDocument) return { status: "duplicate", item: { id: matchingDocument.id, title: matchingDocument.title ?? title } };

  const { data: reservationData, error: reservationError } = await supabase.rpc("reserve_document_upload", {
    input_user_id: userId,
    input_document_id: documentId,
    input_safe_name: safeName,
    input_mime_type: mimeType,
    input_expected_bytes: attachment.size
  });
  if (reservationError?.message.includes("STORAGE_LIMIT_EXCEEDED")) return { status: "storage-limit", item: { title } };
  if (reservationError) throw new EmailImportFailure("DiaryDock could not reserve storage for a forwarded file.");
  const reservation = (Array.isArray(reservationData) ? reservationData[0] : reservationData) as { reservation_id?: string; final_path?: string } | null;
  if (!reservation?.reservation_id || !reservation.final_path) throw new EmailImportFailure("DiaryDock could not reserve storage for a forwarded file.");
  const storagePath = reservation.final_path;

  const { error: uploadError } = await supabase.storage.from(DOCUMENT_BUCKET).upload(storagePath, bytes, { contentType: mimeType, upsert: false });
  if (uploadError && !isDuplicateError(uploadError)) {
    await supabase.rpc("finish_document_upload", { input_user_id: userId, input_reservation_id: reservation.reservation_id, input_commit: false });
    throw new EmailImportFailure("DiaryDock could not securely store one of the forwarded files.");
  }

  const { error: insertError } = await supabase.from("documents").insert({
    id: documentId,
    user_id: userId,
    title,
    category: filingSuggestion.category,
    kind: kindFromMimeType(mimeType),
    size_label: sizeLabel,
    room_id: filingSuggestion.roomId,
    room_name: filingSuggestion.roomName,
    issuer: sender,
    due_date: null,
    storage_bucket: DOCUMENT_BUCKET,
    storage_path: storagePath,
    original_file_name: attachment.name,
    mime_type: mimeType,
    extraction_summary: "Forwarded into DiaryDock by email. Please review the details before relying on them.",
    extracted_text: null,
    action_items: [],
    confidence: null,
    review_status: "needs-review",
    review_reasons: [`Suggested filing: ${filingSuggestion.roomName} · ${filingSuggestion.category}.`, filingSuggestion.reason, "Forwarded by email — check the title, room, category and important dates."],
    reviewed_at: null,
    emergency_visible: false,
    shared_with: []
  });
  if (insertError) {
    if (isDuplicateError(insertError)) {
      await finishReservation(userId, reservation.reservation_id, true);
      return { status: "duplicate", item: { id: documentId, title } };
    }
    await Promise.all([
      supabase.storage.from(DOCUMENT_BUCKET).remove([storagePath]),
      finishReservation(userId, reservation.reservation_id, false)
    ]);
    throw new EmailImportFailure("DiaryDock could not save the forwarded document record.");
  }

  const { data: finished, error: finishError } = await supabase.rpc("finish_document_upload", { input_user_id: userId, input_reservation_id: reservation.reservation_id, input_commit: true });
  if (finishError || finished !== true) {
    await Promise.all([
      supabase.from("documents").delete().eq("user_id", userId).eq("id", documentId),
      supabase.storage.from(DOCUMENT_BUCKET).remove([storagePath])
    ]);
    throw new EmailImportFailure("DiaryDock could not confirm storage for a forwarded file.");
  }

  const { error: inboxError } = await supabase.from("life_inbox_items").upsert({
    user_id: userId,
    document_id: documentId,
    source_type: "email",
    source_ref: attachment.sourceEmailId ?? sender,
    fingerprint,
    status: "needs_review",
    title,
    source_label: sender,
    storage_bucket: DOCUMENT_BUCKET,
    storage_path: storagePath,
    suggested_room: filingSuggestion.roomName,
    suggested_category: filingSuggestion.category,
    item_kind: /bill/i.test(category) ? "Bill" : /statement/i.test(title) ? "Statement"
      : /form/i.test(title) ? "Form" : "Letter",
    route_status: "new",
    suggested_payload: { subject, sender, fileName: attachment.name, mimeType, size: attachment.size, reason: filingSuggestion.reason, confidence: filingSuggestion.confidence },
    review_notes: ["Forwarded by email — check the title, room, category and important dates."]
  }, { onConflict: "user_id,fingerprint" });
  if (inboxError && !isMissingOptionalTableError(inboxError)) throw new EmailImportFailure("DiaryDock saved the document but could not update the review inbox.");
  return { status: "saved", item: { id: documentId, title } };
}

async function finishReservation(userId: string, reservationId: string, commit: boolean) {
  return getSupabaseAdminClient().rpc("finish_document_upload", {
    input_user_id: userId,
    input_reservation_id: reservationId,
    input_commit: commit
  });
}
