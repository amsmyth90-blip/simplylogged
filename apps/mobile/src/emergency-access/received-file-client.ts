import { MAX_DOCUMENT_BYTES } from "@diarydock/documents";

import { readBoundedResponseBytes } from "@mobile/platform/bounded-response-bytes";
import { requestDeadline } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

const allowedTypes = new Set(["application/pdf", "image/heic", "image/jpeg", "image/png", "image/webp"]);

async function digest(bytes: Uint8Array) {
  const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const result = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(result), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function downloadReceivedEmergencyFile(grantId: string, accessToken: string) {
  if (!/^[0-9a-f-]{36}$/i.test(grantId) || accessToken.length < 20 || accessToken.length > 4_096) {
    throw new Error("Please sign in again to open this document.");
  }
  const response = await fetch(new URL(
    `/api/mobile/emergency-access/files/${encodeURIComponent(grantId)}`,
    getSecureRuntime().apiOrigin,
  ), {
    headers: { Authorization: `Bearer ${accessToken}` },
    method: "GET",
    redirect: "error",
    signal: requestDeadline(30_000),
  });
  if (!response.ok) throw new Error(response.status === 401
    ? "Please sign in again to open this document."
    : "This shared document could not be opened safely.");
  const mimeType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
  const expected = response.headers.get("x-content-sha256")?.toLowerCase() ?? "";
  if (!allowedTypes.has(mimeType) || !/^[0-9a-f]{64}$/.test(expected)) {
    throw new Error("The shared file response failed validation.");
  }
  const bytes = await readBoundedResponseBytes(response, MAX_DOCUMENT_BYTES, "shared file");
  if (!bytes.length || await digest(bytes) !== expected) {
    throw new Error("The shared document failed integrity checking.");
  }
  return { bytes, mimeType };
}
