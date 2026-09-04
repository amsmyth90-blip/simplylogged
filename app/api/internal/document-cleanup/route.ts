import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { processDocumentStorageCleanup } from "@/lib/document-cleanup";
import { RequestObservation } from "@/lib/observability/request-observation";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || secret.length < 32 || !header.startsWith("Bearer ")) return false;
  const supplied = header.slice(7);
  const expectedBytes = Buffer.from(secret);
  const suppliedBytes = Buffer.from(supplied);
  return suppliedBytes.length === expectedBytes.length
    && timingSafeEqual(suppliedBytes, expectedBytes);
}

function response(
  observation: RequestObservation,
  body: unknown,
  status: number,
  outcome: string,
) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  observation.finish(headers, { outcome, status });
  return NextResponse.json(body, { headers, status });
}

export async function POST(request: Request) {
  const observation = new RequestObservation({
    operation: "document-storage-cleanup",
    request,
    route: "/api/internal/document-cleanup",
  });
  if (!authorized(request)) {
    return response(observation, { error: "Not found." }, 404, "unauthorized");
  }
  if (!isSupabaseAdminConfigured()) {
    return response(observation, { error: "Cleanup is unavailable." }, 503, "unavailable");
  }
  try {
    const result = await processDocumentStorageCleanup(50);
    return response(observation, result, 200, result.deferred ? "partially-deferred" : "ok");
  } catch {
    return response(observation, { error: "Cleanup could not run." }, 503, "failed");
  }
}
