import { NextResponse } from "next/server";

import { analysePantryRequest } from "@/lib/kitchen/pantry-analysis-request";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSupabaseConfiguredServer()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "You must be signed in to check your kitchen." }, { status: 401 });
  }
  const rate = await checkServerRateLimit(createRateLimitKey("api:kitchen:analyse", user.id), {
    limit: 12, windowMs: 10 * 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many kitchen photo checks. Please wait and try again." }, {
      status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) },
    });
  }
  const result = await analysePantryRequest(request);
  return NextResponse.json(result.body, { status: result.status });
}
