import { Buffer } from "buffer";
import type { Resend } from "resend";

import { MAX_DOCUMENT_BYTES } from "../document-rules.ts";
import { getRequestMediaType, readBoundedBody, RequestBodyError } from "../http/bounded-body.ts";
import { readBoundedJson } from "../http/bounded-json.ts";
import { parseBoundedInboundMultipart } from "./bounded-multipart.ts";

const MAX_WEBHOOK_BYTES = 1024 * 1024;
export const MAX_INBOUND_ATTACHMENTS = 12;
export const MAX_INBOUND_ATTACHMENT_BYTES = MAX_DOCUMENT_BYTES;
export const MAX_LEGACY_WEBHOOK_BYTES = 6 * 1024 * 1024;

export class ResendVerificationError extends Error {}

export type InboundAttachment = {
  name: string;
  mimeType: string;
  bytes: ArrayBuffer | Uint8Array;
  size: number;
  sourceEmailId?: string;
  sourceAttachmentId?: string;
};

export type JsonEmailPayload = {
  to?: unknown;
  recipient?: unknown;
  recipients?: unknown;
  envelope?: unknown;
  subject?: unknown;
  from?: unknown;
  sender?: unknown;
  attachments?: unknown;
};

type JsonAttachment = {
  filename?: unknown;
  name?: unknown;
  contentType?: unknown;
  mimeType?: unknown;
  content?: unknown;
  contentBase64?: unknown;
  base64?: unknown;
};

type AttachmentMetadata = { id: string; filename?: string | null; content_type?: string | null; size?: number };
type ResendReceivedEvent = {
  type: "email.received";
  data: { email_id: string; from?: string; to?: string[]; received_for?: string[]; subject?: string; attachments?: AttachmentMetadata[] };
};

export function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function collectRecipientText(payload: JsonEmailPayload) {
  return [payload.to, payload.recipient, payload.recipients, payload.envelope]
    .map((value) => {
      if (typeof value === "string") return value;
      if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string").join(",");
      return value && typeof value === "object" ? JSON.stringify(value) : "";
    })
    .filter(Boolean)
    .join(",");
}

async function readBoundedStream(stream: ReadableStream<Uint8Array>, maximumBytes: number) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function decodedBase64Length(value: string) {
  const compact = value.replace(/\s/g, "");
  if (!compact || compact.length % 4 === 1 || !/^[A-Za-z0-9+/_-]*={0,2}$/.test(compact)) {
    throw new RequestBodyError("The email contains an invalid attachment.", 400);
  }
  if (compact.includes("=") && compact.length % 4 !== 0) {
    throw new RequestBodyError("The email contains an invalid attachment.", 400);
  }
  const encoded = compact.replace(/-/g, "+").replace(/_/g, "/");
  const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
  const size = Math.floor((encoded.length * 3) / 4) - padding;
  if (size <= 0) throw new RequestBodyError("The email contains an invalid attachment.", 400);
  return { encoded, size };
}

function collectJsonAttachments(payload: JsonEmailPayload) {
  const source = Array.isArray(payload.attachments) ? payload.attachments : [];
  const attachments: InboundAttachment[] = [];
  for (const item of source) {
    if (!item || typeof item !== "object") continue;
    const attachment = item as JsonAttachment;
    const encodedValue = asString(attachment.contentBase64) || asString(attachment.base64) || asString(attachment.content);
    if (!encodedValue) continue;
    if (attachments.length >= MAX_INBOUND_ATTACHMENTS) throw new RequestBodyError("The email contains too many attachments.", 413);
    const decoded = decodedBase64Length(encodedValue);
    const totalBytes = attachments.reduce((total, entry) => total + entry.size, 0);
    if (decoded.size > MAX_DOCUMENT_BYTES || totalBytes + decoded.size > MAX_INBOUND_ATTACHMENT_BYTES) {
      throw new RequestBodyError("The email attachments are too large.", 413);
    }
    const buffer = Buffer.from(decoded.encoded, "base64");
    if (buffer.byteLength !== decoded.size) throw new RequestBodyError("The email contains an invalid attachment.", 400);
    attachments.push({
      name: asString(attachment.filename) || asString(attachment.name) || "forwarded-attachment",
      mimeType: asString(attachment.contentType) || asString(attachment.mimeType) || "application/octet-stream",
      bytes: buffer,
      size: buffer.byteLength
    });
  }
  return attachments;
}

function formPayload(fields: { get(name: string): FormDataEntryValue | string | null }): JsonEmailPayload {
  return {
    to: asString(fields.get("to")),
    recipient: asString(fields.get("recipient")),
    recipients: asString(fields.get("recipients")),
    envelope: asString(fields.get("envelope")),
    subject: asString(fields.get("subject")),
    from: asString(fields.get("from")) || asString(fields.get("sender"))
  };
}

export async function parseInboundPayload(
  request: Request,
  beforeAttachments: (recipientText: string) => Promise<void>
) {
  const mediaType = getRequestMediaType(request);
  if (mediaType === "multipart/form-data") {
    const parsed = await parseBoundedInboundMultipart(request, {
      beforeAttachments: async (fields) => beforeAttachments(collectRecipientText(formPayload({ get: (name) => fields[name] ?? null }))),
      maximumAttachmentBytes: MAX_DOCUMENT_BYTES,
      maximumAttachments: MAX_INBOUND_ATTACHMENTS,
      maximumTotalAttachmentBytes: MAX_INBOUND_ATTACHMENT_BYTES,
      maximumTransportBytes: MAX_LEGACY_WEBHOOK_BYTES,
    });
    const payload = formPayload({ get: (name) => parsed.fields[name] ?? null });
    return { payload, recipientText: collectRecipientText(payload), attachments: parsed.attachments };
  }
  if (mediaType === "application/x-www-form-urlencoded") {
    const bytes = await readBoundedBody(request, MAX_LEGACY_WEBHOOK_BYTES);
    let fields: URLSearchParams;
    try {
      fields = new URLSearchParams(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    } catch {
      throw new RequestBodyError("The request contains invalid form data.", 400);
    }
    const payload = formPayload(fields);
    await beforeAttachments(collectRecipientText(payload));
    return { payload, recipientText: collectRecipientText(payload), attachments: [] };
  }
  if (mediaType === "application/json") {
    const value = await readBoundedJson(request, MAX_LEGACY_WEBHOOK_BYTES);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new RequestBodyError("The request must contain a JSON object.", 400);
    }
    const payload = value as JsonEmailPayload;
    await beforeAttachments(collectRecipientText(payload));
    return { payload, recipientText: collectRecipientText(payload), attachments: collectJsonAttachments(payload) };
  }
  throw new RequestBodyError("The email webhook media type is not supported.", 415);
}

function getResendHeader(request: Request, primary: string, fallback: string) {
  return request.headers.get(primary) ?? request.headers.get(fallback) ?? "";
}

export function hasAnyResendSignature(request: Request) {
  return Boolean(request.headers.get("webhook-id") || request.headers.get("svix-id") || request.headers.get("resend-signature") || request.headers.get("webhook-signature"));
}

export function hasCompleteResendSignature(request: Request) {
  return Boolean(getResendHeader(request, "webhook-id", "svix-id") && getResendHeader(request, "webhook-timestamp", "svix-timestamp") && (request.headers.get("webhook-signature") ?? request.headers.get("svix-signature") ?? request.headers.get("resend-signature")));
}

function isResendReceivedEvent(value: unknown): value is ResendReceivedEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<ResendReceivedEvent>;
  return event.type === "email.received" && Boolean(event.data?.email_id);
}

function parseAttachmentMetadata(value: unknown) {
  if (!Array.isArray(value)) return [];
  const metadata: AttachmentMetadata[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.id !== "string") continue;
    metadata.push({
      id: candidate.id,
      filename: typeof candidate.filename === "string" ? candidate.filename : null,
      content_type: typeof candidate.content_type === "string" ? candidate.content_type : null,
      size: typeof candidate.size === "number" ? candidate.size : undefined
    });
  }
  return metadata;
}

export async function parseResendPayload(
  request: Request,
  resend: Resend,
  webhookSecret: string,
  beforeAttachments: (recipientText: string) => Promise<void>
) {
  const payloadBytes = await readBoundedBody(request, MAX_WEBHOOK_BYTES);
  let event: unknown;
  try {
    event = resend.webhooks.verify({
      payload: Buffer.from(payloadBytes).toString("utf8"),
      webhookSecret,
      headers: {
        id: getResendHeader(request, "webhook-id", "svix-id"),
        timestamp: getResendHeader(request, "webhook-timestamp", "svix-timestamp"),
        signature: request.headers.get("webhook-signature") ?? request.headers.get("svix-signature") ?? request.headers.get("resend-signature") ?? ""
      }
    });
  } catch {
    throw new ResendVerificationError("DiaryDock could not verify this Resend webhook.");
  }
  if (!isResendReceivedEvent(event)) return null;
  const emailResult = await resend.emails.receiving.get(event.data.email_id, { html_format: "cid" });
  if (emailResult.error || !emailResult.data) throw new Error("DiaryDock could not read the received email from Resend.");
  const payload: JsonEmailPayload = { to: emailResult.data.to, recipients: emailResult.data.received_for, subject: emailResult.data.subject, from: emailResult.data.from };
  const recipientText = collectRecipientText(payload);
  await beforeAttachments(recipientText);
  const emailMetadata = parseAttachmentMetadata(emailResult.data.attachments);
  const metadata = emailMetadata.length ? emailMetadata : parseAttachmentMetadata(event.data.attachments);
  const attachments: InboundAttachment[] = [];
  let totalBytes = 0;
  for (const attachment of metadata.slice(0, MAX_INBOUND_ATTACHMENTS)) {
    const declaredSize = attachment.size;
    const remainingBytes = MAX_INBOUND_ATTACHMENT_BYTES - totalBytes;
    if (declaredSize !== undefined && (!Number.isSafeInteger(declaredSize) || declaredSize <= 0 || declaredSize > remainingBytes)) continue;
    const result = await resend.emails.receiving.attachments.get({ emailId: event.data.email_id, id: attachment.id });
    if (result.error || !result.data?.download_url) continue;
    const detailSize = result.data.size;
    if (!Number.isSafeInteger(detailSize) || detailSize <= 0 || detailSize > remainingBytes) continue;
    const response = await fetch(result.data.download_url);
    if (!response.ok || !response.body) continue;
    const length = Number(response.headers.get("content-length") ?? "0");
    if (Number.isFinite(length) && length > remainingBytes) continue;
    const bytes = await readBoundedStream(response.body, remainingBytes);
    if (!bytes) break;
    if (!bytes.byteLength) continue;
    totalBytes += bytes.byteLength;
    attachments.push({
      name: result.data.filename ?? attachment.filename ?? "forwarded-attachment",
      mimeType: result.data.content_type ?? attachment.content_type ?? "application/octet-stream",
      bytes,
      size: bytes.byteLength,
      sourceEmailId: event.data.email_id,
      sourceAttachmentId: attachment.id
    });
  }
  return { payload, recipientText, attachments };
}
