import { createClient } from "@supabase/supabase-js";
import { assertSupabaseClientConfig, documentsBucket, getSupabaseConfigStatus } from "@/lib/supabase/config";

export { documentsBucket };

export function isSupabaseConfigured() {
  return getSupabaseConfigStatus().supabaseConfigured;
}

export function getSupabaseConfigurationError() {
  const status = getSupabaseConfigStatus();
  return status.clientError;
}

export function canUseLocalStorageFallback() {
  return !isSupabaseConfigured();
}

export function getSupabaseClient() {
  assertSupabaseClientConfig();

  if (!isSupabaseConfigured()) {
    return null;
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export async function getCurrentUserId() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}

export async function requireCurrentUserId() {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("Authentication is required when Supabase is configured.");
  }

  return userId;
}
