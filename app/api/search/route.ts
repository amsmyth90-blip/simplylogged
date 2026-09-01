import { NextResponse } from "next/server";

import { checkSharedRateLimit, createRateLimitKey } from "@/lib/rate-limit";
import { loadAuthorizedSearchCandidates } from "@/lib/search/authorized";
import { filterAndRankSearchResults, searchCategories, searchDateFilters, type SearchCategory, type SearchDateFilter } from "@/lib/search/results";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (!isSupabaseConfiguredServer()) return NextResponse.json({ error: "Secure search is not configured." }, { status: 503 });
  const supabase = await getSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return NextResponse.json({ error: "Please sign in again to search DiaryDock." }, { status: 401 });
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim().replace(/\s+/g, " ").slice(0, 80);
  const requestedCategory = url.searchParams.get("category") || "all";
  const requestedDate = url.searchParams.get("date") || "all";
  if (!searchCategories.includes(requestedCategory as SearchCategory) || !searchDateFilters.includes(requestedDate as SearchDateFilter)) return NextResponse.json({ error: "Choose valid search filters." }, { status: 400 });
  const rateLimit = await checkSharedRateLimit(supabase, createRateLimitKey("search", authData.user.id), { limit: 90, windowMs: 5 * 60 * 1000 });
  if (!rateLimit.allowed) return NextResponse.json({ error: "Search is busy. Please wait a moment and try again." }, { status: 429 });

  const authorized = await loadAuthorizedSearchCandidates(supabase, authData.user.id);
  if (authorized.error) return NextResponse.json({ error: "Search could not safely load your records." }, { status: 500 });
  const results = filterAndRankSearchResults(authorized.candidates, query, requestedCategory as SearchCategory, requestedDate as SearchDateFilter).slice(0, 50);
  return NextResponse.json({ results, query, filters: { category: requestedCategory, date: requestedDate } }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
