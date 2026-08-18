import { Buffer } from "buffer";
import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";

import { DOCUMENT_BUCKET, isAcceptedDocumentType, sanitizeDocumentFileName, validateDocumentUpload } from "@/lib/document-rules";
import { getInboundEmailSecret, verifyInboundEmailAddress } from "@/lib/inbound-email";
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

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.DIARYDOCK_INBOUND_WEBHOOK_SECRET?.trim();
  const inboundSecret = getInboundEmailSecret();

  if (!webhookSecret || !inboundSecret || !isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "DiaryDock email forwarding is not fully configured yet." },
      { status: 503 }
    );
  }

  const suppliedSecret =
    request.headers.get("x-diarydock-webhook-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (suppliedSecret !== webhookSecret) {
    return unauthorized();
  }

  const { payload, recipientText, attachments } = await parseInboundPayload(request);
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

  for (const attachment of attachments.slice(0, 12)) {
    const validationError = validateDocumentUpload({ type: attachment.mimeType, size: attachment.size });

    if (validationError || !isAcceptedDocumentType(attachment.mimeType)) {
      continue;
    }

    const documentId = randomUUID();
    const safeName = sanitizeDocumentFileName(attachment.name) || "forwarded-attachment";
    const storagePath = `${userId}/${documentId}/${safeName}`;
    const title = subject || titleFromFileName(attachment.name) || "Forwarded document";
    const sizeLabel = `${Math.max(1, Math.round(attachment.size / 1024))} KB`;
    const category = categoryFromText(`${subject} ${attachment.name}`);

    const { error: uploadError } = await supabase.storage.from(DOCUMENT_BUCKET).upload(storagePath, attachment.bytes, {
      contentType: attachment.mimeType,
      upsert: false
    });

    if (uploadError) {
      return NextResponse.json({ error: "DiaryDock could not securely store one of the forwarded files." }, { status: 500 });
    }

    const { error: insertError } = await supabase.from("documents").insert({
      id: documentId,
      user_id: userId,
      title,
      category,
      kind: kindFromMimeType(attachment.mimeType),
      size_label: sizeLabel,
      room_id: "mailbox",
      room_name: "Mailbox",
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
      review_reasons: ["Forwarded by email — check the title, room, category and important dates."],
      reviewed_at: null,
      emergency_visible: false,
      shared_with: []
    });

    if (insertError) {
      return NextResponse.json({ error: "DiaryDock could not save the forwarded document record." }, { status: 500 });
    }

    saved.push({ id: documentId, title });
  }

  if (!saved.length) {
    return NextResponse.json({ error: "No supported PDF or image attachments were found." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, saved });
}
