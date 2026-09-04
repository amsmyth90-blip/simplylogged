import type { Instrumentation } from "next";

import { emitServerEvent } from "@/lib/observability/safe-event";

export async function register() {
  const { registerOTel } = await import("@vercel/otel");
  registerOTel({ serviceName: "diarydock-web" });
}

function errorKind(error: unknown) {
  if (error instanceof Error && error.name) return error.name;
  return "UnknownError";
}

function errorDigest(error: unknown) {
  if (!error || typeof error !== "object" || !("digest" in error)) return undefined;
  const value = String(error.digest);
  return /^[A-Za-z0-9._-]{1,128}$/.test(value) ? value : undefined;
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  emitServerEvent("error", "next.request_error", {
    digest: errorDigest(error),
    errorKind: errorKind(error),
    method: request.method,
    route: context.routePath,
    routeType: context.routeType,
  });
};
