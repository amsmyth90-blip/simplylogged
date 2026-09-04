import "server-only";

import { authenticateApiRequest } from "./request.ts";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "./server.ts";

export async function authenticateHybridRequest(request: Request) {
  if (request.headers.has("authorization")) return authenticateApiRequest(request);
  if (!isSupabaseConfiguredServer()) return { error: "UNAVAILABLE" as const };
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { error: "UNAUTHENTICATED" as const };
  return { error: null, supabase, user: data.user };
}
