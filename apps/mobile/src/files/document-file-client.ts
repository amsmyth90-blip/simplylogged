import { MAX_DOCUMENT_BYTES } from "@diarydock/documents";

import { readBoundedResponseBytes } from "@mobile/platform/bounded-response-bytes";
import { requestDeadline } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/heic",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function authenticationHeader(accessToken: string) {
  if (accessToken.length < 20 || accessToken.length > 4_096) {
    throw new Error("Please sign in again to open this file.");
  }
  return { Authorization: `Bearer ${accessToken}` };
}

async function digest(bytes: Uint8Array) {
  const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const value = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function downloadDocumentFile(documentId: string, accessToken: string) {
  const url = new URL(
    `/api/mobile/documents/${encodeURIComponent(documentId)}/file`,
    getSecureRuntime().apiOrigin,
  );
  const response = await fetch(url, {
    headers: authenticationHeader(accessToken),
    method: "GET",
    redirect: "error",
    signal: requestDeadline(30_000),
  });
  if (!response.ok) {
    throw new Error(response.status === 401
      ? "Please sign in again to open this file."
      : "This file could not be downloaded safely.");
  }
  const mimeType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
  const expectedDigest = response.headers.get("x-content-sha256")?.toLowerCase() ?? "";
  if (!allowedMimeTypes.has(mimeType) || !/^[0-9a-f]{64}$/.test(expectedDigest)) {
    throw new Error("The file response failed validation.");
  }
  const bytes = await readBoundedResponseBytes(response, MAX_DOCUMENT_BYTES);
  if (!bytes.length || await digest(bytes) !== expectedDigest) {
    throw new Error("The downloaded file failed integrity checking.");
  }
  return { bytes, mimeType, sha256: expectedDigest };
}
