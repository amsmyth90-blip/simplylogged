import { authenticateHybridRequest } from "../supabase/hybrid-request.ts";
import { isSameOriginRequest } from "../http/same-origin.ts";
import { mobileCorsHeaders } from "../http/mobile-cors.ts";
import { checkServerRateLimit, createRateLimitKey } from "../rate-limit-server.ts";

export function appointmentResponse(request: Request, body: unknown, status = 200) {
  const headers = mobileCorsHeaders(request);
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return Response.json(body, { status, headers });
}

export async function appointmentAuth(request: Request, action: string, limit = 20) {
  if (request.method !== "GET" && !request.headers.has("authorization") && !isSameOriginRequest(request)) {
    return { response: appointmentResponse(request, { error: "This request is not allowed." }, 403) };
  }
  const auth = await authenticateHybridRequest(request);
  if (auth.error || !auth.user || !auth.supabase) {
    return { response: appointmentResponse(request, { error: "Please sign in to continue." }, 401) };
  }
  const rate = await checkServerRateLimit(createRateLimitKey(`appointments:${action}`, auth.user.id), { limit, windowMs: 600_000 });
  if (!rate.allowed) return { response: appointmentResponse(request, { error: "Please wait before trying again." }, 429) };
  return { user: auth.user, supabase: auth.supabase };
}
