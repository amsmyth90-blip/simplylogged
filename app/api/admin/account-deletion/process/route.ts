import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { processAccountDeletion } from "@/lib/account-deletion";
import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

type ProcessDeletionBody = {
  requestId?: unknown;
};

function hasValidAdminToken(request: Request) {
  const expected = process.env.ACCOUNT_DELETION_ADMIN_TOKEN;
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";

  if (!expected || !actual) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export async function POST(request: Request) {
  if (!isSupabaseAdminConfigured() || !process.env.ACCOUNT_DELETION_ADMIN_TOKEN) {
    return NextResponse.json({ error: "Account deletion processing is not configured." }, { status: 503 });
  }

  if (!hasValidAdminToken(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: ProcessDeletionBody;
  try {
    const parsed = await readBoundedJson(request, 4 * 1024);
    body = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as ProcessDeletionBody
      : {};
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return NextResponse.json({ error: "The deletion request is invalid." }, { status });
  }
  const requestId = String(body.requestId ?? "").trim();
  if (!requestId) {
    return NextResponse.json({ error: "requestId is required." }, { status: 400 });
  }

  try {
    const result = await processAccountDeletion(getSupabaseAdminClient(), requestId);
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process account deletion.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
