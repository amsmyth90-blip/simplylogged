export const DOCUMENT_BUCKET = "diarydock-documents";
export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
export const ACCEPTED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic"
] as const;

export type AcceptedDocumentType = (typeof ACCEPTED_DOCUMENT_TYPES)[number];

export function sanitizeDocumentFileName(name: string) {
  const sanitized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/-+\./g, ".")
    .replace(/\.{2,}/g, ".")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 96)
    .replace(/[.-]+$/g, "");

  return sanitized || "document";
}

export function isAcceptedDocumentType(mimeType: string) {
  return ACCEPTED_DOCUMENT_TYPES.includes(mimeType as AcceptedDocumentType);
}

export function validateDocumentUpload(input: { type: string; size: number }) {
  if (!isAcceptedDocumentType(input.type)) {
    return "Choose a PDF, JPEG, PNG, WebP or HEIC file.";
  }
  if (input.size > MAX_DOCUMENT_BYTES) {
    return "Please choose a file no larger than 4 MB.";
  }
  if (input.size === 0) {
    return "This file is empty. Please choose another file.";
  }
  return null;
}
