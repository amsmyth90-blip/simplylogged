import { isAcceptedDocumentType } from "../document-rules.ts";

export type CaptureFileInspection =
  | { ok: true; detectedMimeType: string }
  | { ok: false; error: string };

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

export function detectDocumentMimeType(bytes: Uint8Array) {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }

  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp") {
    const brand = String.fromCharCode(...bytes.slice(8, 12)).toLowerCase();
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand)) return "image/heic";
  }

  return null;
}

export function inspectCaptureFile(input: { declaredMimeType: string; bytes: Uint8Array }): CaptureFileInspection {
  if (!input.bytes.length) return { ok: false, error: "This file is empty. Please choose another file." };
  if (!isAcceptedDocumentType(input.declaredMimeType)) {
    return { ok: false, error: "Choose a PDF, JPEG, PNG, WebP or HEIC file." };
  }

  const detectedMimeType = detectDocumentMimeType(input.bytes);
  if (!detectedMimeType) {
    return { ok: false, error: "This file does not appear to be a supported document or image." };
  }
  if (detectedMimeType !== input.declaredMimeType) {
    return { ok: false, error: "The file contents do not match the selected file type." };
  }

  return { ok: true, detectedMimeType };
}

export type CaptureSecurityScanResult = {
  status: "PASSED" | "UNAVAILABLE" | "BLOCKED";
  scanner: string;
};

export interface CaptureSecurityScanner {
  scan(files: Array<{ bytes: Uint8Array; mimeType: string }>): Promise<CaptureSecurityScanResult>;
}

class SignatureOnlyScanner implements CaptureSecurityScanner {
  async scan() {
    return { status: "UNAVAILABLE" as const, scanner: "signature-validation-only" };
  }
}

export function getCaptureSecurityScanner(): CaptureSecurityScanner {
  return new SignatureOnlyScanner();
}

export function captureScannerIsRequired() {
  return process.env.DIARYDOCK_CAPTURE_SCANNER_REQUIRED === "true";
}
