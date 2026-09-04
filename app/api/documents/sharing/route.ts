import { NextResponse } from "next/server";

import { hasRecentAuthentication } from "@/lib/auth/recent-auth";
import {
  parseDocumentSharingMutation,
  parseDocumentSharingQuery,
  parseDocumentSharingResponse,
} from "@/lib/document-sharing-contract";
import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { RequestObservation } from "@/lib/observability/request-observation";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

function respond(observation: RequestObservation, body: unknown, status: number, outcome: string) {
  const headers = new Headers({
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  });
  observation.finish(headers, { outcome, status });
  return NextResponse.json(body, { status, headers });
}

async function authenticate(observation: RequestObservation) {
  if (!isSupabaseConfiguredServer()) return { response: respond(
    observation, { error: "Document sharing is unavailable." }, 503, "auth-unavailable",
  ) };
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { response: respond(
    observation, { error: "Please sign in again to manage sharing." }, 401, "unauthenticated",
  ) };
  return { response: null, supabase, user: data.user };
}

function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

export async function GET(request: Request) {
  const observation = new RequestObservation({
    operation: "document-sharing-read", request, route: "/api/documents/sharing",
  });
  const auth = await authenticate(observation);
  if (auth.response || !auth.supabase || !auth.user) return auth.response!;
  const rate = await checkServerRateLimit(
    createRateLimitKey("documents:sharing:read", auth.user.id),
    { limit: 120, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) return respond(observation, { error: "Sharing is busy. Try again shortly." }, 429, "rate-limited");
  let documentId;
  try { documentId = parseDocumentSharingQuery([...new URL(request.url).searchParams.entries()]); }
  catch { return respond(observation, { error: "Choose a valid document." }, 400, "invalid-query"); }
  const { data, error } = await auth.supabase.rpc("get_document_sharing", {
    target_document_id: documentId,
  });
  if (error) return respond(observation, { error: "Sharing could not be loaded." }, 400, "lookup-failed");
  const row = Array.isArray(data) ? data[0] : data;
  const selectedUserIds = Array.isArray(row?.selected_user_ids)
    ? row.selected_user_ids.filter((value: unknown): value is string => typeof value === "string")
    : [];
  try {
    return respond(observation, parseDocumentSharingResponse({
      visibility: row?.visibility ?? "PRIVATE", selectedUserIds,
    }), 200, "ok");
  } catch {
    return respond(observation, { error: "Sharing could not be loaded." }, 503, "invalid-database-response");
  }
}

export async function POST(request: Request) {
  const observation = new RequestObservation({
    operation: "document-sharing-write", request, route: "/api/documents/sharing",
  });
  if (!sameOrigin(request)) return respond(observation, { error: "Request origin was not accepted." }, 403, "invalid-origin");
  const auth = await authenticate(observation);
  if (auth.response || !auth.supabase || !auth.user) return auth.response!;
  if (!hasRecentAuthentication(auth.user.last_sign_in_at)) return respond(observation, {
    error: "For your security, sign out and sign in again before changing document access.",
    code: "RECENT_AUTH_REQUIRED",
  }, 403, "recent-auth-required");
  const rate = await checkServerRateLimit(
    createRateLimitKey("documents:sharing:write", auth.user.id),
    { limit: 30, windowMs: 5 * 60_000 },
  );
  if (!rate.allowed) return respond(observation, { error: "Please wait before changing sharing again." }, 429, "rate-limited");
  let input;
  try { input = parseDocumentSharingMutation(await readBoundedJson(request, 8 * 1024)); }
  catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return respond(observation, { error: "That sharing choice was not valid." }, status, "invalid-body");
  }
  const { error } = await auth.supabase.rpc("set_document_sharing", {
    target_document_id: input.documentId,
    new_visibility: input.visibility,
    selected_user_ids: input.selectedUserIds,
  });
  if (error) return respond(observation, { error: "Document sharing could not be changed." }, 400, "update-failed");
  return respond(observation, {
    visibility: input.visibility, selectedUserIds: input.selectedUserIds,
  }, 200, "ok");
}
