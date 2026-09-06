import { parsePantryAnalysis, type PantryAnalysisResult } from "@diarydock/kitchen";

import type { CapturedDocument } from "@mobile/capture/capture-source";
import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestDeadline } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

const MAX_TOTAL_BYTES = 16 * 1024 * 1024;

function authentication(accessToken: string) {
  if (accessToken.length < 20 || accessToken.length > 4_096) throw new Error("Please sign in again.");
  return { Accept: "application/json", Authorization: `Bearer ${accessToken}` };
}

function message(value: unknown, fallback: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const error = (value as Record<string, unknown>).error;
  return typeof error === "string" && error.length <= 240 ? error : fallback;
}

export async function analysePantryPhotos(
  captures: CapturedDocument[],
  accessToken: string,
): Promise<PantryAnalysisResult> {
  if (!captures.length || captures.length > 8) throw new Error("Choose between one and eight photos.");
  if (captures.reduce((total, capture) => total + capture.bytes.byteLength, 0) > MAX_TOTAL_BYTES) {
    throw new Error("Keep the combined kitchen photos under 16 MB.");
  }
  const form = new FormData();
  captures.forEach((capture) => {
    const bytes = capture.bytes.buffer.slice(capture.bytes.byteOffset,
      capture.bytes.byteOffset + capture.bytes.byteLength) as ArrayBuffer;
    form.append("files", new File([bytes], capture.fileName, { type: capture.mimeType }));
  });
  const response = await fetch(new URL("/api/mobile/kitchen/analyse", getSecureRuntime().apiOrigin), {
    method: "POST", headers: authentication(accessToken), body: form,
    cache: "no-store", redirect: "error", signal: requestDeadline(90_000),
  }).catch(() => { throw new Error("DiaryDock is offline. Connect to check your kitchen photos."); });
  const payload = await readBoundedJsonResponse(response, 96 * 1024).catch(() => null);
  if (!response.ok) throw new Error(message(payload, "The kitchen photos could not be checked."));
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("The kitchen photo result was not valid.");
  }
  return parsePantryAnalysis((payload as Record<string, unknown>).analysis);
}
