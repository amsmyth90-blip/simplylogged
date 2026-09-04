import { createHash, randomUUID } from "crypto";

import type { InboundAttachment } from "@/lib/email-import/payload";

export function titleFromFileName(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

export function categoryFromText(value: string) {
  const text = value.toLowerCase();
  if (/(will|probate|solicitor|executor|power of attorney|lasting power|estate|funeral)/.test(text)) return "Legal & Estate";
  if (/(mot|vehicle|car|v5c|road tax|breakdown|parking|garage)/.test(text)) return "Vehicles & Transport";
  if (/(medical|health|nhs|gp|prescription|dental|hospital)/.test(text)) return "Health & Medical";
  if (/(passport|licence|birth certificate|id card|identity)/.test(text)) return "Identity";
  if (/(bill|invoice|statement|bank|tax|hmrc|payment|premium|subscription|utility|energy|water|broadband)/.test(text)) return "Finance";
  if (/(pet|vet|garden|outdoor|shed|maintenance)/.test(text)) return "Pets & Outdoor";
  if (/(flight|travel|hotel|booking|trip|ticket)/.test(text)) return "Travel & Access";
  return "Home & Property";
}

export function kindFromMimeType(mimeType: string) {
  if (mimeType === "application/pdf") return "PDF";
  return mimeType.startsWith("image/") ? "Image" : "Scan";
}

export function isDuplicateError(error: { code?: string; message?: string; statusCode?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "23505" || error?.statusCode === "409" || message.includes("duplicate") || message.includes("already exists");
}

export function isMissingOptionalTableError(error: { code?: string; message?: string } | null | undefined) {
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

export function documentIdForInboundAttachment(input: {
  attachment: InboundAttachment;
  recipientText: string;
  sender: string;
  subject: string;
  userId: string;
}) {
  if (input.attachment.sourceEmailId && input.attachment.sourceAttachmentId) {
    return stableUuidFromText(["diarydock-resend-email-attachment", input.userId, input.attachment.sourceEmailId, input.attachment.sourceAttachmentId].join("\u001f"));
  }
  const fallbackIdentity = ["diarydock-forwarded-email-attachment", input.userId, input.recipientText, input.subject, input.sender, input.attachment.name, input.attachment.mimeType, String(input.attachment.size)].join("\u001f");
  return fallbackIdentity.trim() ? stableUuidFromText(fallbackIdentity) : randomUUID();
}
