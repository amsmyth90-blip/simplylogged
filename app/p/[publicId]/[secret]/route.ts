import { NextResponse } from "next/server";

import { hashPhysicalSecret, physicalLookupPattern, physicalSecretPattern } from "@/lib/physical-links";
import { checkServerRateLimit, createRateLimitKey, getForwardedClientIp } from "@/lib/rate-limit-server";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

function privateRedirect(url: URL) {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: Request, { params }: { params: Promise<{ publicId: string; secret: string }> }) {
  const login = new URL("/login?message=Sign%20in%2C%20then%20scan%20the%20tag%20again.", request.url);
  if (!isSupabaseConfiguredServer()) return privateRedirect(login);
  const supabase = await getSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return privateRedirect(login);
  const rateLimit = await checkServerRateLimit(createRateLimitKey("physical-link:resolve", authData.user.id, getForwardedClientIp(request.headers)), { limit: 30, windowMs: 5 * 60 * 1000 });
  const unavailable = new URL("/physical-link-unavailable", request.url);
  if (!rateLimit.allowed) return privateRedirect(unavailable);
  const { publicId, secret } = await params;
  if (!physicalLookupPattern.test(publicId) || !physicalSecretPattern.test(secret)) return privateRedirect(unavailable);
  const { data, error } = await supabase.rpc("resolve_asset_physical_link", { input_public_id: publicId, input_secret_hash: hashPhysicalSecret(secret) });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || row?.resource_type !== "asset" || !row.resource_id) return privateRedirect(unavailable);
  return privateRedirect(new URL(`/assets/${row.resource_id}`, request.url));
}
