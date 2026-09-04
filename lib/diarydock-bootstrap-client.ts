"use client";

import type { DiaryDockBootstrapPayload } from "@/lib/diarydock-types";
import { readBoundedJsonResponse } from "@/lib/http/bounded-json-response";

export async function loadDiaryDockBootstrap() {
  const response = await fetch("/api/diarydock/bootstrap", {
    cache: "no-store",
    credentials: "same-origin",
  });
  const payload = await readBoundedJsonResponse(response, 8 * 1024 * 1024)
    .catch((): { error?: string } => ({}));
  if (!response.ok) {
    const error = payload && typeof payload === "object" && "error" in payload
      && typeof payload.error === "string" ? payload.error : null;
    throw new Error(error ?? "DiaryDock could not load your secure data.");
  }
  return payload as DiaryDockBootstrapPayload;
}
