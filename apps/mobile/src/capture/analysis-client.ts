import { parseCaptureAnalysisResponse } from "@diarydock/capture";

import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestDeadline } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

import type { CapturedDocument } from "./capture-source";

const MAX_ANALYSIS_BYTES = 3.5 * 1024 * 1024;

function authentication(accessToken: string) {
  if (accessToken.length < 20 || accessToken.length > 4_096) throw new Error("Please sign in again.");
  return { Accept: "application/json", Authorization: `Bearer ${accessToken}` };
}

export async function analyseCapturedDocuments(
  captures: CapturedDocument[],
  accessToken: string,
) {
  if (!captures.length || captures.length > 12) throw new Error("Choose between one and twelve pages.");
  if (captures.reduce((total, capture) => total + capture.bytes.length, 0) > MAX_ANALYSIS_BYTES) {
    throw new Error("These pages are too large to read together. Use fewer pages or retake them closer to the document.");
  }
  const form = new FormData();
  form.set("analysisMode", "document");
  captures.forEach((capture) => {
    const data = capture.bytes.buffer.slice(
      capture.bytes.byteOffset,
      capture.bytes.byteOffset + capture.bytes.byteLength,
    ) as ArrayBuffer;
    form.append("files", new File([data], capture.fileName, { type: capture.mimeType }));
  });
  const response = await fetch(new URL("/api/capture/extract", getSecureRuntime().apiOrigin), {
    method: "POST",
    headers: authentication(accessToken),
    body: form,
    redirect: "error",
    signal: requestDeadline(90_000),
  }).catch(() => {
    throw new Error("DiaryDock is offline. You can still save the document and organise it manually.");
  });
  const payload = await readBoundedJsonResponse(response, 256 * 1024).catch(() => null);
  if (!response.ok) {
    const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
    throw new Error(typeof record.error === "string"
      ? record.error : "The document could not be analysed securely right now.");
  }
  return parseCaptureAnalysisResponse(payload);
}
