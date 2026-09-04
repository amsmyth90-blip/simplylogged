import { NextResponse } from "next/server";

import { hasRecentAuthentication } from "@/lib/auth/recent-auth";
import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { createInboundEmailAddress, getInboundEmailSecret } from "@/lib/inbound-email";
import { checkServerRateLimit, createRateLimitKey, getForwardedClientIp } from "@/lib/rate-limit-server";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { authenticateHybridRequest } from "@/lib/supabase/hybrid-request";

export const runtime = "nodejs";

type StorageSummaryRow = {
  tier: string;
  used_bytes: number;
  reserved_bytes: number;
  storage_limit_bytes: number;
};

type SettingsBody = { operation?: unknown; enabled?: unknown; confirmation?: unknown };

function response(request: Request, body: Record<string, unknown>, status = 200) {
  const headers = mobileCorsHeaders(request);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("X-Content-Type-Options", "nosniff");
  return NextResponse.json(body, { status, headers });
}

async function authenticate(request: Request) {
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE") return { error: response(request, { error: "Settings are unavailable." }, 503) };
  if (auth.error || !auth.user || !auth.supabase) {
    return { error: response(request, { error: "Please sign in again to open settings." }, 401) };
  }
  return { auth };
}

export function OPTIONS(request: Request) {
  return mobilePreflight(request);
}

export async function GET(request: Request) {
  const result = await authenticate(request);
  if ("error" in result) return result.error;
  const { user, supabase } = result.auth;
  const rate = await checkServerRateLimit(createRateLimitKey("mobile:settings:read", user.id), {
    limit: 120,
    windowMs: 10 * 60_000,
  });
  if (!rate.allowed) return response(request, { error: "Settings are busy. Try again shortly." }, 429);

  const [analyticsResult, storageResult] = await Promise.all([
    supabase.from("product_analytics_preferences")
      .select("enabled,consented_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    isSupabaseAdminConfigured()
      ? getSupabaseAdminClient().rpc("get_user_storage_summary", { input_user_id: user.id })
      : Promise.resolve({ data: null, error: null }),
  ]);
  const storage = (Array.isArray(storageResult.data) ? storageResult.data[0] : storageResult.data) as StorageSummaryRow | null;
  const inboundSecret = getInboundEmailSecret();
  const forwardingReady = Boolean(inboundSecret) && process.env.DIARYDOCK_INBOUND_EMAIL_PROVIDER_READY === "true";
  const metadata = user.user_metadata;
  const nameCandidate = metadata.full_name ?? metadata.name ?? metadata.given_name;
  return response(request, {
    profile: {
      name: typeof nameCandidate === "string" ? nameCandidate.slice(0, 160) : "",
      email: user.email ?? "",
      memberSince: user.created_at,
    },
    analytics: {
      enabled: analyticsResult.error ? false : Boolean(analyticsResult.data?.enabled),
      retentionDays: 90,
    },
    storage: storageResult.error || !storage ? null : {
      tier: storage.tier,
      usedBytes: Number(storage.used_bytes),
      reservedBytes: Number(storage.reserved_bytes),
      limitBytes: Number(storage.storage_limit_bytes),
    },
    forwarding: forwardingReady ? {
      configured: true,
      address: createInboundEmailAddress(user.id, inboundSecret!),
    } : { configured: false },
  });
}

export async function POST(request: Request) {
  const result = await authenticate(request);
  if ("error" in result) return result.error;
  const { user, supabase } = result.auth;
  let body: SettingsBody;
  try {
    body = await readBoundedJson(request, 4 * 1024) as SettingsBody;
  } catch (error) {
    return response(request, { error: "The settings request is invalid." }, error instanceof RequestBodyError ? error.status : 400);
  }
  const operation = typeof body.operation === "string" ? body.operation : "";
  const rate = await checkServerRateLimit(createRateLimitKey(`mobile:settings:${operation || "invalid"}`, user.id), {
    limit: operation === "REQUEST_DELETION" ? 4 : 60,
    windowMs: operation === "REQUEST_DELETION" ? 60 * 60_000 : 60_000,
  });
  if (!rate.allowed) return response(request, { error: "Please wait before trying again." }, 429);

  if (operation === "SET_ANALYTICS") {
    if (typeof body.enabled !== "boolean") return response(request, { error: "Choose whether to share product usage." }, 400);
    const { data, error } = await supabase.rpc("set_product_analytics_consent", { input_enabled: body.enabled });
    if (error) return response(request, { error: "Your privacy preference could not be saved." }, 503);
    return response(request, { enabled: Boolean(data), eventsDeleted: !body.enabled });
  }

  if (operation === "REQUEST_DELETION") {
    if (String(body.confirmation ?? "").trim().toUpperCase() !== "DELETE") {
      return response(request, { error: "Type DELETE to confirm the account deletion request." }, 400);
    }
    if (!hasRecentAuthentication(user.last_sign_in_at)) {
      return response(request, {
        error: "For your security, sign out and sign in again before requesting account deletion.",
        code: "RECENT_AUTH_REQUIRED",
      }, 403);
    }
    const clientIp = getForwardedClientIp(request.headers);
    const deletionRate = await checkServerRateLimit(createRateLimitKey("account:deletion:request", user.id, clientIp), {
      limit: 4,
      windowMs: 60 * 60_000,
    });
    if (!deletionRate.allowed) return response(request, { error: "Too many deletion requests. Please wait before trying again." }, 429);
    const { data, error } = await supabase.rpc("request_account_deletion", {
      request_source: "mobile-settings",
      request_user_agent: request.headers.get("user-agent") ?? "",
    }).single();
    if (error || !data) return response(request, { error: "Your deletion request could not be recorded." }, 503);
    return response(request, {
      status: String((data as { status?: unknown }).status ?? "pending"),
      message: "Your account deletion request has been recorded for verification and processing.",
    });
  }

  return response(request, { error: "That settings action is not supported." }, 400);
}
