"use client";

import {
  parseDocumentSharingResponse,
  type DocumentSharing,
} from "@/lib/document-sharing-contract";
import { readBoundedJsonResponse } from "@/lib/http/bounded-json-response";
import type { ResourceVisibility } from "@/lib/resource-access";

async function sharingRequest(path: string, init?: RequestInit): Promise<DocumentSharing> {
  const response = await fetch(`/api/documents/sharing${path}`, {
    ...init,
    cache: "no-store",
    headers: init?.body
      ? { "Content-Type": "application/json", ...init.headers }
      : init?.headers,
  });
  const payload = await readBoundedJsonResponse(response, 16 * 1024)
    .catch((): { error?: string } => ({}));
  if (!response.ok) {
    const error = payload && typeof payload === "object" && "error" in payload
      && typeof payload.error === "string" ? payload.error : null;
    throw new Error(error ?? "The document sharing choice could not be saved.");
  }
  return parseDocumentSharingResponse(payload);
}

export async function getDocumentSharing(documentId: string): Promise<DocumentSharing> {
  const payload = await sharingRequest(`?documentId=${encodeURIComponent(documentId)}`);
  return {
    visibility: payload.visibility,
    selectedUserIds: payload.selectedUserIds,
  };
}

export async function setDocumentSharing(input: {
  documentId: string;
  visibility: ResourceVisibility;
  selectedUserIds?: string[];
}) {
  await sharingRequest("", {
    method: "POST",
    body: JSON.stringify({ ...input, selectedUserIds: input.selectedUserIds ?? [] }),
  });
}
