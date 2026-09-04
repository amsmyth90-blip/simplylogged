import { inspectDocumentBytes } from "@diarydock/documents";

import { HttpCaptureSecurityScanner } from "./http-security-scanner.ts";

export type CaptureFileInspection =
  | { ok: true; detectedMimeType: string }
  | { ok: false; error: string };

export { detectDocumentMimeType } from "@diarydock/documents";

export function inspectCaptureFile(input: { declaredMimeType: string; bytes: Uint8Array }): CaptureFileInspection {
  return inspectDocumentBytes(input);
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
  const endpoint = process.env.DIARYDOCK_MALWARE_SCANNER_URL?.trim();
  const token = process.env.DIARYDOCK_MALWARE_SCANNER_TOKEN?.trim();
  if (endpoint && token) {
    try {
      return new HttpCaptureSecurityScanner({ endpoint, token });
    } catch {
      return new SignatureOnlyScanner();
    }
  }
  return new SignatureOnlyScanner();
}

export function captureScannerIsRequired() {
  const configured = process.env.DIARYDOCK_CAPTURE_SCANNER_REQUIRED;
  if (configured === "true") return true;
  if (configured === "false") return false;
  return process.env.NODE_ENV === "production";
}
