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

  return checkSharedRateLimit(getSupabaseAdminClient(), key, options, "deny");
}
