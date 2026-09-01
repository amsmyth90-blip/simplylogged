import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
};

type RateLimitRpcRow = {
  allowed: boolean;
  remaining: number;
  retry_after_seconds: number;
};

declare global {
  var __diaryDockRateLimitStore: Map<string, RateLimitEntry> | undefined;
}

const store = globalThis.__diaryDockRateLimitStore ?? new Map<string, RateLimitEntry>();
globalThis.__diaryDockRateLimitStore = store;

export function createRateLimitKey(...parts: string[]) {
  return createHash("sha256").update(parts.join("\u001f")).digest("hex");
}

function compactExpiredEntries(now: number) {
  if (store.size < 1000) {
    return;
  }

  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  compactExpiredEntries(now);

  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + options.windowMs });
    return {
      allowed: true,
      remaining: options.limit - 1,
      retryAfterSeconds: 0
    };
  }

  if (existing.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
    };
  }

  existing.count += 1;
  store.set(key, existing);

  return {
    allowed: true,
    remaining: Math.max(0, options.limit - existing.count),
    retryAfterSeconds: 0
  };
}

export function getForwardedClientIp(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || headers.get("x-real-ip") || "unknown";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseRateLimitRow(value: unknown): RateLimitRpcRow | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!isRecord(row)) {
    return null;
  }

  const allowed = row.allowed;
  const remaining = row.remaining;
  const retryAfterSeconds = row.retry_after_seconds;

  if (
    typeof allowed !== "boolean" ||
    typeof remaining !== "number" ||
    typeof retryAfterSeconds !== "number"
  ) {
    return null;
  }

  return {
    allowed,
    remaining,
    retry_after_seconds: retryAfterSeconds
  };
}

export async function checkSharedRateLimit(
  supabase: SupabaseClient,
  key: string,
  options: RateLimitOptions,
  failureMode: "memory" | "deny" = "memory",
): Promise<RateLimitResult> {
  const onFailure = () => failureMode === "deny"
    ? { allowed: false, remaining: 0, retryAfterSeconds: 60 }
    : checkRateLimit(key, options);

  if (key.length > 256) {
    return { allowed: false, remaining: 0, retryAfterSeconds: 60 };
  }
  try {
    const { data, error } = await supabase.rpc("check_rate_limit", {
      bucket_key: key,
      max_requests: options.limit,
      window_seconds: Math.ceil(options.windowMs / 1000)
    });

    if (error) {
      return onFailure();
    }

    const row = parseRateLimitRow(data);
    if (!row) {
      return onFailure();
    }

    return {
      allowed: row.allowed,
      remaining: Math.max(0, row.remaining),
      retryAfterSeconds: Math.max(0, row.retry_after_seconds)
    };
  } catch {
    return onFailure();
  }
}
