import { NextResponse } from "next/server";

import { hashEmergencyInviteSecret, isEmergencyInvitePayload } from "@/lib/emergency-access";
import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!isSupabaseConfiguredServer()) return NextResponse.json({ error: "Trusted access is not configured." }, { status: 503 });
  const supabase = await getSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return NextResponse.json({ error: "Sign in with the invited email address first." }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    const parsed = await readBoundedJson(request, 4 * 1024);
    body = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown> : {};
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return NextResponse.json({ error: "This invitation is unavailable." }, { status });
  }
  const publicId = typeof body.publicId === "string" ? body.publicId : "";
  const secret = typeof body.secret === "string" ? body.secret : "";
  if (!isEmergencyInvitePayload(publicId, secret)) return NextResponse.json({ error: "This invitation is unavailable." }, { status: 400 });
  const { data, error } = await supabase.rpc("accept_trusted_emergency_invite", { input_public_id: publicId, input_secret_hash: hashEmergencyInviteSecret(secret) });
  if (error || !data) return NextResponse.json({ error: "This invitation is unavailable. Check that you signed in with the invited email." }, { status: 400 });
  return NextResponse.json({ accepted: true, next: "/emergency/shared" }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
