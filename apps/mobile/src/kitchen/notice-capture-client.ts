import { parseNoticeCaptureResponse, type NoticeCaptureResponse } from "@diarydock/kitchen";

import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestDeadline } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

import type { CapturedDocument } from "@mobile/capture/capture-source";

function authorization(accessToken: string) {
  if (accessToken.length < 20 || accessToken.length > 4_096) throw new Error("Please sign in again.");
  return `Bearer ${accessToken}`;
}

function fileFromDocument(document: CapturedDocument) {
  const data = document.bytes.buffer.slice(
    document.bytes.byteOffset,
    document.bytes.byteOffset + document.bytes.byteLength,
  ) as ArrayBuffer;
  return new File([data], document.fileName, { type: document.mimeType });
}

function errorMessage(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = (value as Record<string, unknown>).error;
  return typeof candidate === "string" && candidate.length <= 240 ? candidate : null;
}

export async function captureKitchenNotice(input: {
  accessToken: string;
  file: File | CapturedDocument;
  mode: "photo" | "voice";
}): Promise<NoticeCaptureResponse> {
  const file = input.file instanceof File ? input.file : fileFromDocument(input.file);
  const form = new FormData();
  form.set("mode", input.mode);
  form.set("file", file);
  const response = await fetch(new URL("/api/kitchen/noticeboard/extract", getSecureRuntime().apiOrigin), {
    method: "POST",
    body: form,
    redirect: "error",
    headers: { Accept: "application/json", Authorization: authorization(input.accessToken) },
    signal: requestDeadline(90_000),
  }).catch(() => { throw new Error("Connect to the internet to prepare a notice from media."); });
  const payload = await readBoundedJsonResponse(response, 32 * 1024).catch(() => null);
  if (!response.ok) throw new Error(errorMessage(payload) ?? "That notice could not be prepared securely.");
  return parseNoticeCaptureResponse(payload);
}
