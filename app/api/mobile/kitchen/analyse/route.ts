import { NextResponse } from "next/server";

import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { analysePantryRequest } from "@/lib/kitchen/pantry-analysis-request";
import { RequestObservation } from "@/lib/observability/request-observation";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { authenticateHybridRequest } from "@/lib/supabase/hybrid-request";

export const runtime = "nodejs";

function respond(request: Request, observation: RequestObservation, body: unknown,
  status: number, outcome: string, records = 0) {
  const headers = mobileCorsHeaders(request);
  headers.set("X-Content-Type-Options", "nosniff");
  observation.finish(headers, { outcome, records, status });
  return NextResponse.json(body, { headers, status });
}

export function OPTIONS(request: Request) {
  return mobilePreflight(request);
}

export async function POST(request: Request) {
  const observation = new RequestObservation({ operation: "mobile-kitchen-analyse",
    request, route: "/api/mobile/kitchen/analyse" });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return respond(request, observation, { error: "Kitchen photo reading is unavailable." },
      503, "auth-unavailable");
  }
  if (auth.error || !auth.user) {
    return respond(request, observation, { error: "Please sign in again to check your kitchen." },
      401, "unauthenticated");
  }
  const rate = await checkServerRateLimit(createRateLimitKey("mobile:kitchen:analyse", auth.user.id), {
    limit: 12, windowMs: 10 * 60_000,
  });
  if (!rate.allowed) {
    return respond(request, observation, { error: "Too many kitchen photo checks. Please wait and try again." },
      429, "rate-limited");
  }
  const result = await analysePantryRequest(request);
  return respond(request, observation, result.body, result.status,
    result.status === 200 ? "ok" : "analysis-failed", result.records);
}
