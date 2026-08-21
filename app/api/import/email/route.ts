import { Buffer } from "buffer";
import { createHash, randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";

import { DOCUMENT_BUCKET, isAcceptedDocumentType, sanitizeDocumentFileName, validateDocumentUpload } from "@/lib/document-rules";
import { getInboundEmailSecret, verifyInboundEmailAddress } from "@/lib/inbound-email";
import { createLifeInboxFingerprint } from "@/lib/life-inbox/dedupe";
import { suggestFilingDestination } from "@/lib/life-inbox/suggestions";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonAttachment = {
  filename?: unknown;
  name?: unknown;
  contentType?: unknown;
  mimeType?: unknown;
  content?: unknown;
  contentBase64?: unknown;
  base64?: unknown;
};

type InboundAttachment = {
  name: string;
  mimeType: string;
  bytes: ArrayBuffer;
  size: number;
  sourceEmailId?: string;
  sourceAttachmentId?: string;
};

type AttachmentMetadata = {
  id: string;
  filename?: string | null;
  content_type?: string | null;
};

type ResendReceivedEvent = {
  type: "email.received";
  data: {
    email_id: string;
    from?: string;
    to?: string[];
    received_for?: string[];
    subject?: string;
    attachments?: AttachmentMetadata[];
  };
};

type JsonEmailPayload = {
  to?: unknown;
  recipient?: unknown;
  recipients?: unknown;
  envelope?: unknown;
  subject?: unknown;
  from?: unknown;
  sender?: unknown;
  attachments?: unknown;
};

function unauthorized(message = "DiaryDock email intake is not authorised.") {
  return NextResponse.json({ error: message }, { status: 401 });
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function collectRecipientText(payload: JsonEmailPayload) {
  const fields = [payload.to, payload.recipient, payload.recipients, payload.envelope]
    .map((value) => {
      if (typeof value === "string") return value;
      if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string").join(",");
      if (value && typeof value === "object") return JSON.stringify(value);
      return "";
    })
    .filter(Boolean);

  return fields.join(",");
}

function titleFromFileName(name: string) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function categoryFromText(value: string) {
  const text = value.toLowerCase();

  if (/(will|probate|solicitor|executor|power of attorney|lasting power|estate|funeral)/.test(text)) {
    return "Legal & Estate";
  }
  if (/(mot|vehicle|car|v5c|road tax|breakdown|parking|garage)/.test(text)) {
    return "Vehicles & Transport";
  }
  if (/(medical|health|nhs|gp|prescription|dental|hospital)/.test(text)) {
    return "Health & Medical";
  }
  if (/(passport|licence|birth certificate|id card|identity)/.test(text)) {
    return "Identity";
  }
  if (/(bill|invoice|statement|bank|tax|hmrc|payment|premium|subscription|utility|energy|water|broadband)/.test(text)) {
    return "Finance";
  }
  if (/(pet|vet|garden|outdoor|shed|maintenance)/.test(text)) {
    return "Pets & Outdoor";
  }
  if (/(flight|travel|hotel|booking|trip|ticket)/.test(text)) {
    return "Travel & Access";
  }

  return "Home & Property";
}

function kindFromMimeType(mimeType: string) {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("image/")) return "Image";
  return "Scan";
}

function isDuplicateError(error: { code?: string; message?: string; statusCode?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "23505" || error?.statusCode === "409" || message.includes("duplicate") || message.includes("already exists");
}

function isMissingOptionalTableError(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "42P01" || message.includes("could not find the table") || message.includes("schema cache");
}

function stableUuidFromText(value: string) {
  const bytes = createHash("sha256").update(value).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function documentIdForInboundAttachment({
  userId,
  recipientText,
  subject,
  sender,
  attachment
}: {
  userId: string;
  recipientText: string;
  subject: string;
  sender: string;
  attachment: InboundAttachment;
}) {
  if (attachment.sourceEmailId && attachment.sourceAttachmentId) {
    return stableUuidFromText(
      [
        "diarydock-resend-email-attachment",
        userId,
        attachment.sourceEmailId,
        attachment.sourceAttachmentId
      ].join("\u001f")
    );
  }

  const fallbackIdentity = [
    "diarydock-forwarded-email-attachment",
    userId,
    recipientText,
    subject,
    sender,
    attachment.name,
    attachment.mimeType,
    String(attachment.size)
  ].join("\u001f");

  return fallbackIdentity.trim() ? stableUuidFromText(fallbackIdentity) : randomUUID();
}

function isFileLike(value: FormDataEntryValue): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

async function collectFormAttachments(formData: FormData) {
  const attachments: InboundAttachment[] = [];

  for (const [, value] of formData.entries()) {
    if (!isFileLike(value) || value.size <= 0) {
      continue;
    }

    attachments.push({
      name: value.name || "forwarded-attachment",
      mimeType: value.type || "application/octet-stream",
      bytes: await value.arrayBuffer(),
      size: value.size
    });
  }

  return attachments;
}

function isJsonAttachment(value: unknown): value is JsonAttachment {
  return Boolean(value && typeof value === "object");
}

function collectJsonAttachments(payload: JsonEmailPayload) {
  const source = Array.isArray(payload.attachments) ? payload.attachments : [];
  const attachments: InboundAttachment[] = [];

  for (const item of source) {
    if (!isJsonAttachment(item)) {
      continue;
    }

    const encoded = asString(item.contentBase64) || asString(item.base64) || asString(item.content);
    const name = asString(item.filename) || asString(item.name) || "forwarded-attachment";
    const mimeType = asString(item.contentType) || asString(item.mimeType) || "application/octet-stream";

    if (!encoded) {
      continue;
    }

    const buffer = Buffer.from(encoded, "base64");
    attachments.push({
      name,
      mimeType,
      bytes: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      size: buffer.byteLength
    });
  }

  return attachments;
}

async function parseInboundPayload(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await request.formData();
    const payload: JsonEmailPayload = {
      to: asString(formData.get("to")),
      recipient: asString(formData.get("recipient")),
      recipients: asString(formData.get("recipients")),
      envelope: asString(formData.get("envelope")),
      subject: asString(formData.get("subject")),
      from: asString(formData.get("from")) || asString(formData.get("sender"))
    };

    return {
      payload,
      recipientText: collectRecipientText(payload),
      attachments: await collectFormAttachments(formData)
    };
  }

  const payload = (await request.json().catch(() => ({}))) as JsonEmailPayload;

  return {
    payload,
    recipientText: collectRecipientText(payload),
    attachments: collectJsonAttachments(payload)
  };
}

function hasResendSignature(request: NextRequest) {
  return Boolean(
    request.headers.get("webhook-id") ||
      request.headers.get("svix-id") ||
      request.headers.get("resend-signature") ||
      request.headers.get("webhook-signature")
  );
}

function getResendHeader(request: NextRequest, primary: string, fallback: string) {
  return request.headers.get(primary) ?? request.headers.get(fallback) ?? "";
}

function isResendReceivedEvent(value: unknown): value is ResendReceivedEvent {
  if (!value || typeof value !== "object") return false;

  const event = value as Partial<ResendReceivedEvent>;
  return event.type === "email.received" && Boolean(event.data?.email_id);
}

async function parseResendPayload(request: NextRequest, resend: Resend, webhookSecret: string) {
  const payload = await request.text();
  const event = resend.webhooks.verify({
    payload,
    webhookSecret,
    headers: {
      id: getResendHeader(request, "webhook-id", "svix-id"),
      timestamp: getResendHeader(request, "webhook-timestamp", "svix-timestamp"),
      signature:
        request.headers.get("webhook-signature") ??
        request.headers.get("svix-signature") ??
        request.headers.get("resend-signature") ??
        ""
    }
  });

  if (!isResendReceivedEvent(event)) {
    return null;
  }

  const emailResult = await resend.emails.receiving.get(event.data.email_id, { html_format: "cid" });
  if (emailResult.error || !emailResult.data) {
    throw new Error("DiaryDock could not read the received email from Resend.");
  }

  const attachmentMetadata =
    emailResult.data.attachments?.length ? emailResult.data.attachments : event.data.attachments ?? [];
  const attachments: InboundAttachment[] = [];

  for (const attachment of attachmentMetadata.slice(0, 12)) {
    const id = attachment.id;
    const attachmentResult = await resend.emails.receiving.attachments.get({
      emailId: event.data.email_id,
      id
    });

    if (attachmentResult.error || !attachmentResult.data?.download_url) {
      continue;
    }

    const response = await fetch(attachmentResult.data.download_url);
    if (!response.ok) {
      continue;
    }

    const bytes = await response.arrayBuffer();
    attachments.push({
      name: attachmentResult.data.filename ?? attachment.filename ?? "forwarded-attachment",
      mimeType: attachmentResult.data.content_type ?? attachment.content_type ?? "application/octet-stream",
      bytes,
      size: bytes.byteLength,
      sourceEmailId: event.data.email_id,
      sourceAttachmentId: id
    });
  }

  const payloadForDiaryDock: JsonEmailPayload = {
    to: emailResult.data.to,
    recipients: emailResult.data.received_for,
    subject: emailResult.data.subject,
    from: emailResult.data.from
  };

  return {
    payload: payloadForDiaryDock,
    recipientText: collectRecipientText(payloadForDiaryDock),
    attachments
  };
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim() ?? process.env.DIARYDOCK_INBOUND_WEBHOOK_SECRET?.trim();
  const inboundSecret = getInboundEmailSecret();
  const resendApiKey = process.env.RESEND_API_KEY?.trim();

  if (!webhookSecret || !inboundSecret || !isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "DiaryDock email forwarding is not fully configured yet." },
      { status: 503 }
    );
  }

  let parsedPayload: Awaited<ReturnType<typeof parseInboundPayload>>;

  if (hasResendSignature(request)) {
    if (!resendApiKey) {
      return NextResponse.json({ error: "Resend API access is not configured yet." }, { status: 503 });
    }

    try {
      const resend = new Resend(resendApiKey);
      const resendPayload = await parseResendPayload(request, resend, webhookSecret);

      if (!resendPayload) {
        return NextResponse.json({ ok: true, skipped: true });
      }

      parsedPayload = resendPayload;
    } catch {
      return unauthorized("DiaryDock could not verify this Resend webhook.");
    }
  } else {
    const suppliedSecret =
      request.headers.get("x-diarydock-webhook-secret") ??
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    if (suppliedSecret !== webhookSecret) {
      return unauthorized();
    }

    parsedPayload = await parseInboundPayload(request);
  }

  const { payload, recipientText, attachments } = parsedPayload;
  const userId = verifyInboundEmailAddress(recipientText, inboundSecret);

  if (!userId) {
    return NextResponse.json({ error: "No valid DiaryDock forwarding address was found." }, { status: 400 });
  }

  if (!attachments.length) {
    return NextResponse.json({ error: "No supported attachments were found to import." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const subject = asString(payload.subject).trim();
  const sender = asString(payload.from) || asString(payload.sender) || "Forwarded email";
  const saved: { id: string; title: string }[] = [];
  const skippedDuplicates: { id: string; title: string }[] = [];

  for (const attachment of attachments.slice(0, 12)) {
    const validationError = validateDocumentUpload({ type: attachment.mimeType, size: attachment.size });

    if (validationError || !isAcceptedDocumentType(attachment.mimeType)) {
      continue;
    }

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
    const documentId = documentIdForInboundAttachment({
      userId,
      recipientText,
      subject,
      sender,
      attachment
    });
    const storagePath = `${userId}/${documentId}/${safeName}`;
    const fingerprint = createLifeInboxFingerprint({
      userId,
      sourceType: "email",
      sourceId: attachment.sourceEmailId
        ? `${attachment.sourceEmailId}:${attachment.sourceAttachmentId ?? attachment.name}`
        : `${recipientText}:${sender}:${subject}`,
      title,
      fileName: attachment.name,
      mimeType: attachment.mimeType,
      size: attachment.size
    });

    const { data: existingDocument, error: existingDocumentError } = await supabase
      .from("documents")
      .select("id,title")
      .eq("user_id", userId)
      .eq("id", documentId)
      .maybeSingle();

    if (existingDocumentError) {
      return NextResponse.json({ error: "DiaryDock could not check for duplicate forwarded files." }, { status: 500 });
    }

    if (existingDocument) {
      skippedDuplicates.push({ id: existingDocument.id, title: existingDocument.title ?? title });
      continue;
    }

    const { data: existingInboxItem, error: existingInboxError } = await supabase
      .from("life_inbox_items")
      .select("id,document_id,title")
      .eq("user_id", userId)
      .eq("fingerprint", fingerprint)
      .maybeSingle();

    if (existingInboxError && !isMissingOptionalTableError(existingInboxError)) {
      return NextResponse.json({ error: "DiaryDock could not check the import inbox for duplicate forwarded files." }, { status: 500 });
    }

    if (existingInboxItem?.document_id) {
      skippedDuplicates.push({ id: existingInboxItem.document_id, title: existingInboxItem.title ?? title });
      continue;
    }

    const { data: matchingDocument, error: matchingDocumentError } = await supabase
      .from("documents")
      .select("id,title")
      .eq("user_id", userId)
      .eq("issuer", sender)
      .eq("title", title)
      .eq("original_file_name", attachment.name)
      .eq("mime_type", attachment.mimeType)
      .eq("size_label", sizeLabel)
      .limit(1)
      .maybeSingle();

    if (matchingDocumentError) {
      return NextResponse.json({ error: "DiaryDock could not check for duplicate forwarded files." }, { status: 500 });
    }

    if (matchingDocument) {
      skippedDuplicates.push({ id: matchingDocument.id, title: matchingDocument.title ?? title });
      continue;
    }

    const { error: uploadError } = await supabase.storage.from(DOCUMENT_BUCKET).upload(storagePath, attachment.bytes, {
      contentType: attachment.mimeType,
      upsert: false
    });

    if (uploadError && !isDuplicateError(uploadError)) {
      return NextResponse.json({ error: "DiaryDock could not securely store one of the forwarded files." }, { status: 500 });
    }

    const documentRow = {
      id: documentId,
      user_id: userId,
      title,
      category: filingSuggestion.category,
      kind: kindFromMimeType(attachment.mimeType),
      size_label: sizeLabel,
      room_id: filingSuggestion.roomId,
      room_name: filingSuggestion.roomName,
      issuer: sender,
      due_date: null,
      storage_bucket: DOCUMENT_BUCKET,
      storage_path: storagePath,
      original_file_name: attachment.name,
      mime_type: attachment.mimeType,
      extraction_summary: "Forwarded into DiaryDock by email. Please review the details before relying on them.",
      extracted_text: null,
      action_items: [],
      confidence: null,
      review_status: "needs-review",
      review_reasons: [
        `Suggested filing: ${filingSuggestion.roomName} · ${filingSuggestion.category}.`,
        filingSuggestion.reason,
        "Forwarded by email — check the title, room, category and important dates."
      ],
      reviewed_at: null,
      emergency_visible: false,
      shared_with: []
    };

    const { error: insertError } = await supabase.from("documents").insert(documentRow);

    if (insertError) {
      if (isDuplicateError(insertError)) {
        skippedDuplicates.push({ id: documentId, title });
        continue;
      }

      return NextResponse.json({ error: "DiaryDock could not save the forwarded document record." }, { status: 500 });
    }

    const { error: inboxInsertError } = await supabase.from("life_inbox_items").upsert(
      {
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
        suggested_payload: {
          subject,
          sender,
          fileName: attachment.name,
          mimeType: attachment.mimeType,
          size: attachment.size,
          reason: filingSuggestion.reason,
          confidence: filingSuggestion.confidence
        },
        review_notes: ["Forwarded by email — check the title, room, category and important dates."]
      },
      { onConflict: "user_id,fingerprint" }
    );

    if (inboxInsertError && !isMissingOptionalTableError(inboxInsertError)) {
      return NextResponse.json({ error: "DiaryDock saved the document but could not update the review inbox." }, { status: 500 });
    }

    saved.push({ id: documentId, title });
  }

  if (!saved.length && skippedDuplicates.length) {
    return NextResponse.json({ ok: true, saved, skippedDuplicates });
  }

  if (!saved.length) {
    return NextResponse.json({ error: "No supported PDF or image attachments were found." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, saved, skippedDuplicates });
}
