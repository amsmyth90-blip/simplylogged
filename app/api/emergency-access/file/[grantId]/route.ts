import { NextResponse } from "next/server";

import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: { params: Promise<{ grantId: string }> }) {
  if (!isSupabaseConfiguredServer()) return NextResponse.redirect(new URL("/emergency/shared", _request.url));
  const { grantId } = await context.params;
  if (!uuidPattern.test(grantId)) return NextResponse.redirect(new URL("/emergency/shared", _request.url));
  const supabase = await getSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return NextResponse.redirect(new URL("/login", _request.url));
  const { data, error } = await supabase.rpc("get_emergency_document_location", { input_grant_id: grantId });
  const location = Array.isArray(data) ? data[0] : data;
  if (error || !location?.bucket || !location?.path) return NextResponse.redirect(new URL("/emergency/shared", _request.url));
  const signed = await supabase.storage.from(String(location.bucket)).createSignedUrl(String(location.path), 60);
  if (signed.error || !signed.data?.signedUrl) return NextResponse.redirect(new URL("/emergency/shared", _request.url));
  const file = await fetch(signed.data.signedUrl, { cache: "no-store" });
  if (!file.ok || !file.body) return NextResponse.redirect(new URL("/emergency/shared", _request.url));
  const safeTitle = String(location.title || "emergency-document").replace(/[^A-Za-z0-9._ -]/g, "").slice(0, 100) || "emergency-document";
  return new NextResponse(file.body, { status: 200, headers: { "Cache-Control": "private, no-store, max-age=0", "Content-Type": file.headers.get("content-type") || "application/octet-stream", "Content-Disposition": `inline; filename="${safeTitle}"`, "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" } });
}
