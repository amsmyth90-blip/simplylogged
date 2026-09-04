export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
export const MAX_DOCUMENT_METADATA_BYTES = 48 * 1024;
export const MAX_DOCUMENT_COMMIT_REQUEST_BYTES = 64 * 1024;

export const ACCEPTED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;

export type AcceptedDocumentType = (typeof ACCEPTED_DOCUMENT_TYPES)[number];

const acceptedTypes = new Set<string>(ACCEPTED_DOCUMENT_TYPES);

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

export function sanitizeDocumentFileName(name: string) {
  const sanitized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/-\./g, ".")
    .replace(/\.{2,}/g, ".")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 96)
    .replace(/[.-]+$/g, "");
  return sanitized || "document";
}

export function isAcceptedDocumentType(mimeType: string): mimeType is AcceptedDocumentType {
  return acceptedTypes.has(mimeType);
}

export function validateDocumentUpload(input: { type: string; size: number }) {
  if (!isAcceptedDocumentType(input.type)) return "Choose a PDF, JPEG, PNG, WebP or HEIC file.";
  if (input.size > MAX_DOCUMENT_BYTES) return "Please choose a file no larger than 4 MB.";
  if (input.size === 0) return "This file is empty. Please choose another file.";
  return null;
}

export function detectDocumentMimeType(bytes: Uint8Array): AcceptedDocumentType | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46])
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) return "image/webp";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp") {
    const brand = String.fromCharCode(...bytes.slice(8, 12)).toLowerCase();
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand)) return "image/heic";
  }
  return null;
}

export function inspectDocumentBytes(input: { declaredMimeType: string; bytes: Uint8Array }) {
  const validationError = validateDocumentUpload({
    type: input.declaredMimeType,
    size: input.bytes.byteLength,
  });
  if (validationError) return { ok: false as const, error: validationError };
  const detectedMimeType = detectDocumentMimeType(input.bytes);
  if (!detectedMimeType) {
    return { ok: false as const, error: "This file does not appear to be a supported document or image." };
  }
  if (detectedMimeType !== input.declaredMimeType) {
    return { ok: false as const, error: "The file contents do not match the selected file type." };
  }
  return { ok: true as const, detectedMimeType };
}
