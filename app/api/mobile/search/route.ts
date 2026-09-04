import { NextResponse } from "next/server";

import {
  SEARCH_SCHEMA_VERSION,
  filterAndRankSearchResults,
  searchCategories,
  searchDateFilters,
  type SearchCategory,
  type SearchDateFilter,
} from "@diarydock/search";

import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { RequestObservation } from "@/lib/observability/request-observation";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { loadAuthorizedSearchCandidates } from "@/lib/search/authorized";
import { authenticateHybridRequest } from "@/lib/supabase/hybrid-request";

export const runtime = "nodejs";

function response(
  request: Request,
  observation: RequestObservation,
  body: Record<string, unknown>,
  status: number,
  outcome: string,
  records = 0,
) {
  const headers = mobileCorsHeaders(request);
  headers.set("X-Content-Type-Options", "nosniff");
  observation.finish(headers, { outcome, records, status });
  return NextResponse.json(body, { status, headers });
}

export function OPTIONS(request: Request) {
  return mobilePreflight(request);
}

export async function GET(request: Request) {
  const observation = new RequestObservation({
    operation: "mobile-search",
    request,
    route: "/api/mobile/search",
  });
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") {
    return response(request, observation, { error: "Secure search is unavailable." }, 503, "auth-unavailable");
  }
  if (auth.error || !auth.user || !auth.supabase) {
    return response(request, observation, { error: "Please sign in again to search DiaryDock." }, 401, "unauthenticated");
  }

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim().replace(/\s+/g, " ");
  const category = url.searchParams.get("category") ?? "all";
  const date = url.searchParams.get("date") ?? "all";
  if (query.length > 80
    || !searchCategories.includes(category as SearchCategory)
    || !searchDateFilters.includes(date as SearchDateFilter)) {
    return response(request, observation, { error: "Choose a valid search and filters." }, 400, "invalid-input");
  }

  const rate = await checkServerRateLimit(createRateLimitKey("mobile:search", auth.user.id), {
    limit: 90,
    windowMs: 5 * 60_000,
  });
  if (!rate.allowed) {
    const result = response(request, observation, { error: "Search is busy. Try again shortly." }, 429, "rate-limited");
    result.headers.set("Retry-After", String(rate.retryAfterSeconds));
    return result;
  }

  const authorized = await loadAuthorizedSearchCandidates(auth.supabase, auth.user.id);
  if (authorized.error) {
    return response(request, observation, { error: "Search could not safely load your records." }, 503, "database-unavailable");
  }
  const results = filterAndRankSearchResults(
    authorized.candidates,
    query,
    category as SearchCategory,
    date as SearchDateFilter,
  ).slice(0, 50);
  return response(request, observation, {
    schemaVersion: SEARCH_SCHEMA_VERSION,
    query,
    filters: { category, date },
    results,
  }, 200, "ok", results.length);
}
