import { healthResponse } from "@/lib/observability/health-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request) {
  return healthResponse(request, "/api/health/live", { status: "ok" });
}
