import { parseGroceryAnalysis, type GroceryAnalysisResult } from "@diarydock/kitchen";

import type { CapturedDocument } from "@mobile/capture/capture-source";
import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestDeadline } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function message(value: unknown, fallback: string) {
  const candidate = record(value)?.error;
  return typeof candidate === "string" && candidate.length <= 240 ? candidate : fallback;
}

function authorization(accessToken: string) {
  if (accessToken.length < 20 || accessToken.length > 4_096) throw new Error("Please sign in again.");
  return `Bearer ${accessToken}`;
}

export async function analyseGroceryPhotos(
  captures: CapturedDocument[],
  accessToken: string,
): Promise<GroceryAnalysisResult> {
  const form = new FormData();
  captures.forEach((capture, index) => {
    form.append("files", new Blob([capture.bytes as BlobPart], { type: capture.mimeType }),
      capture.fileName || `grocery-${index + 1}.jpg`);
  });
  const response = await fetch(new URL(
    "/api/mobile/kitchen/groceries/analyse", getSecureRuntime().apiOrigin,
  ), {
    method: "POST",
    cache: "no-store",
    headers: { Authorization: authorization(accessToken) },
    body: form,
    signal: requestDeadline(55_000),
  });
  const payload = await readBoundedJsonResponse(response, 64 * 1024);
  if (!response.ok) throw new Error(message(payload, "The grocery labels could not be read."));
  const analysis = record(payload)?.analysis;
  return parseGroceryAnalysis(analysis);
}
