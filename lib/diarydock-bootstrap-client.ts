"use client";

import type { DiaryDockBootstrapPayload } from "@/lib/diarydock-types";
import { readBoundedJsonResponse } from "@/lib/http/bounded-json-response";

export async function loadDiaryDockBootstrap() {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch("/api/diarydock/bootstrap", {
      cache: "no-store",
      credentials: "same-origin",
    });
    const payload = await readBoundedJsonResponse(response, 8 * 1024 * 1024)
      .catch((): { error?: string } => ({}));
    if (response.ok) return payload as DiaryDockBootstrapPayload;

    const error = payload && typeof payload === "object" && "error" in payload
      && typeof payload.error === "string" ? payload.error : null;
    const transient = response.status === 503
      && Boolean(error && /(household|data).*could not be loaded/i.test(error));
    if (transient && attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      continue;
    }
    throw new Error(error ?? "DiaryDock could not load your secure data.");
  }
  throw new Error("DiaryDock could not load your secure data.");
}
