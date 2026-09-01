import "server-only";

import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import {
  checkRateLimit,
  checkSharedRateLimit,
  createRateLimitKey,
  getForwardedClientIp,
} from "@/lib/rate-limit";

export { createRateLimitKey, getForwardedClientIp };

export async function checkServerRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
) {
  if (!isSupabaseAdminConfigured()) {
    if (process.env.NODE_ENV === "production") {
      return { allowed: false, remaining: 0, retryAfterSeconds: 60 };
    }
    return checkRateLimit(key, options);
  }

  const admin = getSupabaseAdminClient();
  const result = await checkSharedRateLimit(admin, key, options, "deny");

  // Cleanup is deliberately rare so the hot rate-limit path stays an indexed upsert.
  if (Math.random() < 0.0002) {
    await Promise.all([
      admin.rpc("cleanup_rate_limit_buckets"),
      admin.rpc("cleanup_document_upload_reservations"),
    ]).catch(() => undefined);
  }

  return result;
}
