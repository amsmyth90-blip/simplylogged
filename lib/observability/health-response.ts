import "server-only";

import { NextResponse } from "next/server";

import { RequestObservation } from "./request-observation";

export function healthResponse(
  request: Request,
  route: string,
  body: Record<string, unknown>,
  status = 200,
  outcome = "ok",
) {
  const headers = new Headers({
    "Cache-Control": "no-store, max-age=0",
    "Content-Type": "application/json",
    "X-Content-Type-Options": "nosniff",
  });
  new RequestObservation({ operation: "health", request, route }).finish(headers, { outcome, status });
  return NextResponse.json(body, { headers, status });
}
