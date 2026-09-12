"use client";
import { useRouter } from "next/navigation";
import { RecapsPanel } from "./RecapsPanel";
import type { RecapPreferences } from "../../lib/recaps/model";
import { readBoundedJsonResponse } from "../../lib/http/bounded-json-response";
async function request(method: "GET" | "POST", body?: RecapPreferences) {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const response = await fetch("/api/recaps?timeZone=" + encodeURIComponent(zone), {
    method, cache: "no-store", signal: AbortSignal.timeout(20000), headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await readBoundedJsonResponse(response, 256 * 1024);
  if (!response.ok) throw new Error((result as { error?: string }).error || "Recaps could not load.");
  return result as Awaited<ReturnType<Parameters<typeof RecapsPanel>[0]["request"]>>;
}
export function WebRecaps() {
  const router = useRouter();
  return <RecapsPanel request={request} onOpen={(target) => router.push(target === "appointments" ? "/bedroom/appointments" : "/reminders")} />;
}
