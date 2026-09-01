import { NextResponse } from "next/server";

import { validateProductAnalyticsEvent } from "@/lib/product-analytics";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

async function authenticatedClient() {
  if (!isSupabaseConfiguredServer()) return null;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  return error || !data.user ? null : { supabase, user: data.user };
}

export async function GET() {
  const auth = await authenticatedClient();
  if (!auth) return NextResponse.json({ error: "Please sign in again to view analytics privacy." }, { status: 401, headers: privateHeaders });
  const { data, error } = await auth.supabase.from("product_analytics_preferences").select("enabled, consented_at, updated_at").eq("user_id", auth.user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Your analytics preference could not be loaded." }, { status: 500, headers: privateHeaders });
  return NextResponse.json({ enabled: Boolean(data?.enabled), consentedAt: data?.consented_at ?? null, retentionDays: 90 }, { headers: privateHeaders });
}

export async function POST(request: Request) {
  const auth = await authenticatedClient();
  if (!auth) return NextResponse.json({ error: "Please sign in again to use analytics privacy." }, { status: 401, headers: privateHeaders });
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > 2048) return NextResponse.json({ error: "That analytics request is too large." }, { status: 413, headers: privateHeaders });
  const rateLimit = await checkServerRateLimit(createRateLimitKey("product-analytics", auth.user.id), { limit: 60, windowMs: 60_000 });
  if (!rateLimit.allowed) return NextResponse.json({ error: "Please wait before trying again." }, { status: 429, headers: { ...privateHeaders, "Retry-After": String(rateLimit.retryAfterSeconds) } });
  const body = await request.json().catch((): Record<string, unknown> => ({}));

  if (body.operation === "SET_CONSENT") {
    if (typeof body.enabled !== "boolean") return NextResponse.json({ error: "Choose whether to share product usage." }, { status: 400, headers: privateHeaders });
    const { data, error } = await auth.supabase.rpc("set_product_analytics_consent", { input_enabled: body.enabled });
    if (error) return NextResponse.json({ error: "Your analytics preference could not be saved." }, { status: 400, headers: privateHeaders });
    return NextResponse.json({ enabled: Boolean(data), eventsDeleted: !body.enabled }, { headers: privateHeaders });
  }

  if (body.operation === "TRACK") {
    try {
      const validated = validateProductAnalyticsEvent(body.event, body.properties);
      const { data, error } = await auth.supabase.rpc("record_product_analytics_event", { input_event_name: validated.event, input_properties: validated.properties });
      if (error) return NextResponse.json({ recorded: false }, { headers: privateHeaders });
      return NextResponse.json({ recorded: Boolean(data) }, { headers: privateHeaders });
    } catch {
      return NextResponse.json({ error: "That analytics event is not allowed." }, { status: 400, headers: privateHeaders });
    }
  }

  return NextResponse.json({ error: "That analytics request was not valid." }, { status: 400, headers: privateHeaders });
}
