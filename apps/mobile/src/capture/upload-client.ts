import type { PendingDocumentUpload } from "@diarydock/offline-store";
import { MAX_DOCUMENT_COMMIT_REQUEST_BYTES } from "@diarydock/documents";

import { getMobileSupabase } from "@mobile/auth/supabase-client";
import { readBoundedJsonResponse } from "@mobile/platform/bounded-json-response";
import { requestDeadline } from "@mobile/platform/request-deadline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

import { UploadTransportError } from "./upload-transport-error";

type PreparedUpload = {
  reservationId: string;
  bucket: string;
  path: string;
  token: string;
};

type CompletedUpload = {
  documentId: string;
  fileVersion: string;
};

function authHeaders(accessToken: string) {
  if (accessToken.length < 20 || accessToken.length > 4_096) {
    throw new UploadTransportError("Please sign in again.", 401, null, false);
  }
  return {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

function retryAfter(response: Response) {
  const value = Number(response.headers.get("retry-after"));
  return Number.isFinite(value) && value >= 1 && value <= 3_600 ? Math.ceil(value) : null;
}

async function checkedJson(response: Response) {
  const payload = await readBoundedJsonResponse(response, 64 * 1024).catch(() => ({}));
  if (response.ok) return payload;
  const body = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const serverMessage = typeof body.error === "string" ? body.error : "The document could not be uploaded.";
  const permanent = [400, 413, 422].includes(response.status);
  throw new UploadTransportError(serverMessage, response.status, retryAfter(response), permanent);
}

function prepared(value: unknown): PreparedUpload {
  if (!value || typeof value !== "object") throw new Error("The upload reservation is invalid.");
  const row = value as Record<string, unknown>;
  for (const key of ["reservationId", "bucket", "path", "token"] as const) {
    if (typeof row[key] !== "string" || !row[key]) throw new Error("The upload reservation is invalid.");
  }
  return row as PreparedUpload;
}

function completed(value: unknown, expectedDocumentId: string): CompletedUpload {
  if (!value || typeof value !== "object") throw new Error("The upload confirmation is invalid.");
  const row = value as Record<string, unknown>;
  if (row.documentId !== expectedDocumentId || typeof row.fileVersion !== "string"
    || !/^[0-9a-f]{32}$/.test(row.fileVersion)) {
    throw new Error("The upload confirmation is invalid.");
  }
  return { documentId: expectedDocumentId, fileVersion: row.fileVersion };
}

export class HttpDocumentUploadClient {
  private readonly apiOrigin = getSecureRuntime().apiOrigin;

  async upload(item: PendingDocumentUpload, accessToken: string): Promise<CompletedUpload> {
    const headers = authHeaders(accessToken);
    let reservation: PreparedUpload | null = null;
    try {
      reservation = await this.prepare(item, headers);
      const arrayBuffer = item.bytes.buffer.slice(
        item.bytes.byteOffset,
        item.bytes.byteOffset + item.bytes.byteLength,
      ) as ArrayBuffer;
      const file = new File([arrayBuffer], item.fileName, { type: item.mimeType });
      const { error } = await getMobileSupabase().storage
        .from(reservation.bucket)
        .uploadToSignedUrl(reservation.path, reservation.token, file, {
          contentType: item.mimeType,
          upsert: false,
        });
      if (error) throw new UploadTransportError("The secure upload channel failed.", null, null, false);
      const result = await this.commit(item, reservation, headers);
      if (item.details?.captureJobId) await this.confirmCapture(item, headers);
      return result;
    } catch (error) {
      if (reservation) void this.cancel(reservation.reservationId, headers);
      if (error instanceof UploadTransportError) throw error;
      throw new UploadTransportError("DiaryDock is offline. The document remains encrypted on this device.", null, null, false);
    }
  }

  private async prepare(item: PendingDocumentUpload, headers: Record<string, string>) {
    const response = await fetch(new URL("/api/documents/uploads/prepare", this.apiOrigin), {
      method: "POST",
      headers,
      body: JSON.stringify({
        documentId: item.documentId,
        fileName: item.fileName,
        mimeType: item.mimeType,
        size: item.byteLength,
      }),
      redirect: "error",
      signal: requestDeadline(20_000),
    });
    return prepared(await checkedJson(response));
  }

  private async commit(
    item: PendingDocumentUpload,
    reservation: PreparedUpload,
    headers: Record<string, string>,
  ) {
    const body = JSON.stringify({
      reservationId: reservation.reservationId,
      metadata: {
        title: item.title,
        category: item.category,
        roomName: item.roomName ?? "Office",
        ...item.details,
      },
    });
    if (new TextEncoder().encode(body).byteLength > MAX_DOCUMENT_COMMIT_REQUEST_BYTES) {
      throw new UploadTransportError("The document details are too large.", 413, null, true);
    }
    const request = () => fetch(new URL("/api/documents/uploads/commit", this.apiOrigin), {
      method: "POST",
      headers,
      body,
      redirect: "error",
      signal: requestDeadline(45_000),
    });
    let response;
    try {
      response = await request();
    } catch {
      response = await request();
    }
    return completed(await checkedJson(response), item.documentId);
  }

  private async confirmCapture(item: PendingDocumentUpload, headers: Record<string, string>) {
    const response = await fetch(new URL("/api/capture/jobs/confirm", this.apiOrigin), {
      method: "POST",
      headers,
      body: JSON.stringify({
        captureJobId: item.details?.captureJobId,
        documentId: item.documentId,
        confirmedFields: item.details?.confirmedFields ?? [],
      }),
      redirect: "error",
      signal: requestDeadline(20_000),
    });
    await checkedJson(response);
  }

  private async cancel(reservationId: string, headers: Record<string, string>) {
    await fetch(new URL("/api/documents/uploads/commit", this.apiOrigin), {
      method: "DELETE",
      headers,
      body: JSON.stringify({ reservationId }),
      redirect: "error",
      signal: requestDeadline(10_000),
    }).catch(() => undefined);
  }
}
