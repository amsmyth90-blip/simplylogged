"use client";

import type { VaultDocument } from "@/lib/mock-data";
import { readBoundedJsonResponse } from "@/lib/http/bounded-json-response";
import { structuredDocumentInput } from "@/lib/structured-document-contract";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function requestDocument(method: "DELETE" | "POST", body: unknown) {
  if (!getSupabaseBrowserClient()) return;
  const response = await fetch("/api/diarydock/documents", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const value = await readBoundedJsonResponse(response, 16 * 1024);
  if (!response.ok || !record(value) || value.status !== "OK") {
    throw new Error(method === "DELETE"
      ? "DiaryDock could not safely delete this document."
      : "DiaryDock could not safely save this document.");
  }
}

export async function upsertStructuredDocument(document: VaultDocument) {
  await requestDocument("POST", structuredDocumentInput(document));
}

export async function deleteStructuredDocument(document: VaultDocument) {
  await requestDocument("DELETE", { documentId: document.id });
}
