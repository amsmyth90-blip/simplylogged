import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null) {
  // Browsers treat a backslash as a slash, so "/\evil.com" would leave the site.
  if (!value || !/^\/(?![/\\])[A-Za-z0-9\-._~/?=&%]*$/.test(value)) {
    return "/dashboard";
  }
  return value;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=That%20sign-in%20link%20has%20expired%20or%20is%20invalid.", requestUrl.origin));
}
