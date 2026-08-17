import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { checkSharedRateLimit, createRateLimitKey, getForwardedClientIp } from "@/lib/rate-limit";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

type DeletionRequestBody = {
  confirmation?: unknown;
};

type AccountDeletionRequestRow = {
  id: string;
  status: string;
};

export async function POST(request: Request) {
  if (!isSupabaseConfiguredServer()) {
    return NextResponse.json({ error: "Account deletion requests are not configured yet." }, { status: 503 });
  }

  const body = await request.json().catch((): DeletionRequestBody => ({}));
  if (String(body.confirmation ?? "").trim().toUpperCase() !== "DELETE") {
    return NextResponse.json({ error: "Type DELETE to confirm the account deletion request." }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "You must be signed in to request account deletion." }, { status: 401 });
  }

  const requestHeaders = await headers();
  const clientIp = getForwardedClientIp(requestHeaders);
  const rateLimit = await checkSharedRateLimit(
    supabase,
    createRateLimitKey("account:deletion:request", user.id, clientIp),
    { limit: 4, windowMs: 60 * 60 * 1000 }
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many deletion requests. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const userAgent = requestHeaders.get("user-agent") ?? "";
  const { data, error } = await supabase
    .rpc("request_account_deletion", {
      request_source: "settings",
      request_user_agent: userAgent
    })
    .single();

  const deletionRequest = data as AccountDeletionRequestRow | null;

  if (error || !deletionRequest) {
    return NextResponse.json(
      { error: error?.message ?? "Unable to record the deletion request." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    requestId: deletionRequest.id,
    status: deletionRequest.status,
    message: "Your account deletion request has been recorded. We will verify ownership and process eligible data within 30 days."
  });
}
