"use client";

import type { ResourceVisibility } from "@/lib/resource-access";

export type DocumentSharing = {
  visibility: ResourceVisibility;
  selectedUserIds: string[];
};

type SharingResponse = DocumentSharing & { error?: string };

async function sharingRequest(path: string, init?: RequestInit): Promise<SharingResponse> {
  const response = await fetch(`/api/documents/sharing${path}`, {
    ...init,
    cache: "no-store",
    headers: init?.body
      ? { "Content-Type": "application/json", ...init.headers }
      : init?.headers,
  });
  const payload = await response.json().catch((): { error?: string } => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? "The document sharing choice could not be saved.");
  }
  return payload as SharingResponse;
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
    body: JSON.stringify(input),
  });
}
