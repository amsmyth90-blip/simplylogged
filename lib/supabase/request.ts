import "server-only";

import { createClient } from "@supabase/supabase-js";

function publicKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer ([^\s]{20,4096})$/.exec(header);
  return match?.[1] ?? null;
}

export async function authenticateApiRequest(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = publicKey();
  const token = bearerToken(request);
  if (!url || !key) return { error: "UNAVAILABLE" as const };
  if (!token) return { error: "UNAUTHENTICATED" as const };

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return { error: "UNAUTHENTICATED" as const };
  return { error: null, supabase, user: data.user };
}
