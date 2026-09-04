import { NextResponse } from "next/server";

import { dispatchCaptureAnalysis } from "@/lib/capture/analysis-dispatch";
import { readCaptureInput } from "@/lib/capture/analysis-input";
import { secureCaptureFiles } from "@/lib/capture/analysis-security";
import { getCaptureAnalysisProvider } from "@/lib/capture/provider";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { authenticateHybridRequest } from "@/lib/supabase/hybrid-request";

export const runtime = "nodejs";

export function OPTIONS(request: Request) {
  return mobilePreflight(request);
}

export async function POST(request: Request) {
  const headers = mobileCorsHeaders(request);
  const respond = (body: Record<string, unknown>, status = 200) => (
    NextResponse.json(body, { status, headers })
  );
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") return respond({ error: "Secure document analysis is unavailable." }, 503);
  if (auth.error || !auth.user || !auth.supabase) {
    return respond({ error: "You must be signed in to use document capture." }, 401);
  }
  const provider = getCaptureAnalysisProvider();
  if (!provider) return respond({ error: "Secure document analysis is not configured." }, 503);

  const rate = await checkServerRateLimit(createRateLimitKey("api:capture:extract", auth.user.id), {
    limit: 20,
    windowMs: 10 * 60_000,
  });
  if (!rate.allowed) {
    headers.set("Retry-After", String(rate.retryAfterSeconds));
    return respond({ error: "Too many document scans. Please wait a moment and try again." }, 429);
  }

  const input = await readCaptureInput(request, auth.user.id).catch(() => null);
  if (!input) return respond({ error: "The document upload is invalid." }, 400);
  if (!input.ok) return respond({ error: input.error }, input.status);
  const security = await secureCaptureFiles(input.files);
  if (!security.ok) return respond({ error: security.error }, security.status);

  const captureJobId = crypto.randomUUID();
  const created = await auth.supabase.from("capture_jobs").insert({
    id: captureJobId,
    user_id: auth.user.id,
    status: "EXTRACTING",
    analysis_mode: input.analysisMode,
    page_count: input.files.length,
    detected_mime_types: security.files.map((file) => file.mimeType),
    security_scan_status: security.scanStatus,
    scanner_name: security.scannerName,
    provider_name: provider.name,
  });
  if (created.error) return respond({ error: "DiaryDock could not start a secure capture job." }, 503);

  try {
    const analysis = await dispatchCaptureAnalysis(provider, input.analysisMode, security.files);
    const completed = await auth.supabase
      .from("capture_jobs")
      .update({ status: "NEEDS_REVIEW", proposed_fields: analysis.proposedFields })
      .eq("id", captureJobId)
      .eq("user_id", auth.user.id)
      .eq("status", "EXTRACTING");
    if (completed.error) throw new Error("CAPTURE_JOB_UPDATE_FAILED");
    return respond({ captureJobId, ...analysis.response });
  } catch {
    await auth.supabase
      .from("capture_jobs")
      .update({ status: "FAILED", failure_code: "PROVIDER_FAILURE" })
      .eq("id", captureJobId)
      .eq("user_id", auth.user.id);
    return respond({ error: "The document could not be analysed securely right now." }, 503);
  }
}
