import {
  captureScannerIsRequired,
  getCaptureSecurityScanner,
  inspectCaptureFile,
} from "./file-security.ts";
import type { CaptureFile, SafeCaptureFile } from "./analysis-types.ts";

type SecurityResult =
  | { ok: true; files: SafeCaptureFile[]; scanStatus: string; scannerName: string }
  | { ok: false; error: string; status: number };

export async function secureCaptureFiles(files: CaptureFile[]): Promise<SecurityResult> {
  const inspected = await Promise.all(files.map(async (file) => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    return { bytes, inspection: inspectCaptureFile({ declaredMimeType: file.type, bytes }) };
  }));
  const invalid = inspected.find((entry) => !entry.inspection.ok);
  if (invalid && !invalid.inspection.ok) {
    return { ok: false, error: invalid.inspection.error, status: 400 };
  }
  const safeFiles = inspected.map((entry) => ({
    bytes: entry.bytes,
    mimeType: entry.inspection.ok ? entry.inspection.detectedMimeType : "application/octet-stream",
  }));
  const scan = await getCaptureSecurityScanner().scan(safeFiles);
  if (scan.status === "BLOCKED" || (captureScannerIsRequired() && scan.status !== "PASSED")) {
    return { ok: false, error: "This document could not pass the configured security check.", status: 422 };
  }
  return { ok: true, files: safeFiles, scanStatus: scan.status, scannerName: scan.scanner };
}
