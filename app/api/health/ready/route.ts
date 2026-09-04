import { healthResponse } from "@/lib/observability/health-response";
import { inspectProductionRuntimeEnvironment } from "@/lib/config/production-environment";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TIMEOUT_MS = 3_000;

async function databaseReady() {
  if (!isSupabaseAdminConfigured()) return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const result = await getSupabaseAdminClient().from("rate_limit_buckets")
      .select("bucket_key")
      .limit(1)
      .abortSignal(controller.signal);
    return !result.error;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function configurationReady() {
  return process.env.NODE_ENV !== "production"
    || inspectProductionRuntimeEnvironment(process.env).length === 0;
}

export async function GET(request: Request) {
  const ready = configurationReady() && await databaseReady();
  return ready
    ? healthResponse(request, "/api/health/ready", { status: "ready" })
    : healthResponse(request, "/api/health/ready", { status: "unavailable" }, 503, "dependency-unavailable");
}
