import { NextResponse } from "next/server";
import { parseEncryptedEntry, parseVaultSetup } from "@diarydock/password-vault";

import { hasRecentAuthentication } from "@/lib/auth/recent-auth";
import { readBoundedJson, RequestBodyError } from "@/lib/http/bounded-json";
import { mobileCorsHeaders, mobilePreflight } from "@/lib/http/mobile-cors";
import { isSameOriginRequest } from "@/lib/http/same-origin";
import {
  createPasswordVault,
  deletePasswordVaultEntry,
  loadPasswordVault,
  putPasswordVaultEntry,
} from "@/lib/password-vault/server";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { authenticateHybridRequest } from "@/lib/supabase/hybrid-request";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function respond(request: Request, body: unknown, status = 200, retryAfter?: number) {
  const headers = mobileCorsHeaders(request);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("X-Content-Type-Options", "nosniff");
  if (retryAfter) headers.set("Retry-After", String(retryAfter));
  return NextResponse.json(body, { status, headers });
}

export function OPTIONS(request: Request) {
  return mobilePreflight(request);
}

async function authorize(request: Request, action: string, limit: number) {
  if (request.method !== "GET" && !request.headers.has("authorization") && !isSameOriginRequest(request)) {
    return { response: respond(request, { error: "This request is not allowed." }, 403) };
  }
  const auth = await authenticateHybridRequest(request);
  if (auth.error === "UNAVAILABLE")
    return { response: respond(request, { error: "Password Vault is unavailable." }, 503) };
  if (auth.error || !auth.user)
    return { response: respond(request, { error: "Please sign in again to open Password Vault." }, 401) };
  const expectedAccount = request.headers.get("X-DiaryDock-Account");
  if (
    (expectedAccount && expectedAccount !== auth.user.id) ||
    (request.method === "POST" && !request.headers.has("authorization") && expectedAccount !== auth.user.id)
  ) {
    return {
      response: respond(request, { error: "Your signed-in account changed. Reload before continuing." }, 409),
    };
  }
  const rate = await checkServerRateLimit(createRateLimitKey(`password-vault:${action}`, auth.user.id), {
    limit,
    windowMs: 5 * 60_000,
  });
  if (!rate.allowed)
    return {
      response: respond(request, { error: "Please wait before trying again." }, 429, rate.retryAfterSeconds),
    };
  if (!isSupabaseAdminConfigured())
    return { response: respond(request, { error: "Password Vault storage is unavailable." }, 503) };
  return { user: auth.user, admin: getSupabaseAdminClient() };
}

export async function GET(request: Request) {
  const auth = await authorize(request, "read", 90);
  if ("response" in auth) return auth.response;
  try {
    return respond(request, { snapshot: await loadPasswordVault(auth.admin, auth.user.id) });
  } catch {
    return respond(request, { error: "Password Vault could not be refreshed." }, 503);
  }
}

function exactKeys(value: Record<string, unknown>, keys: string[]) {
  return Object.keys(value).length === keys.length && keys.every((key) => key in value);
}

export async function POST(request: Request) {
  const auth = await authorize(request, "write", 50);
  if ("response" in auth) return auth.response;
  let body: Record<string, unknown>;
  try {
    const value = await readBoundedJson(request, 80 * 1024);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid body");
    body = value as Record<string, unknown>;
  } catch (error) {
    return respond(
      request,
      { error: "That Password Vault change was not valid." },
      error instanceof RequestBodyError ? error.status : 400,
    );
  }
  try {
    if (body.action === "SETUP" && exactKeys(body, ["action", "setup"])) {
      if (!hasRecentAuthentication(auth.user.last_sign_in_at))
        return respond(request, { error: "Please sign in again before creating your vault." }, 403);
      const setup = parseVaultSetup(body.setup);
      if (!setup || setup.revision !== 1)
        return respond(request, { error: "That vault setup was not valid." }, 400);
      const status = await createPasswordVault(auth.admin, auth.user.id, setup);
      if (status === "CONFLICT")
        return respond(request, { error: "A vault already exists for this account." }, 409);
    } else if (body.action === "PUT_ENTRY" && exactKeys(body, ["action", "entry", "expectedRevision"])) {
      const entry = parseEncryptedEntry(body.entry);
      const expected = body.expectedRevision;
      if (
        !entry ||
        !UUID.test(entry.id) ||
        typeof expected !== "number" ||
        !Number.isSafeInteger(expected) ||
        expected < 0 ||
        expected >= Number.MAX_SAFE_INTEGER ||
        entry.revision !== expected + 1
      )
        return respond(request, { error: "That encrypted vault item was not valid." }, 400);
      const status = await putPasswordVaultEntry(auth.admin, auth.user.id, entry, expected);
      if (status === "CAPACITY")
        return respond(
          request,
          { error: "Your vault holds up to 500 accounts. Remove an unused item first." },
          409,
        );
      if (status === "CONFLICT")
        return respond(
          request,
          { error: "This vault changed on another device. Refresh and try again." },
          409,
        );
    } else if (body.action === "DELETE_ENTRY" && exactKeys(body, ["action", "id", "expectedRevision"])) {
      const expected = body.expectedRevision;
      if (
        typeof body.id !== "string" ||
        !UUID.test(body.id) ||
        typeof expected !== "number" ||
        !Number.isSafeInteger(expected) ||
        expected < 1
      )
        return respond(request, { error: "That vault item was not valid." }, 400);
      const status = await deletePasswordVaultEntry(auth.admin, auth.user.id, body.id, expected);
      if (status === "CONFLICT")
        return respond(
          request,
          { error: "This vault changed on another device. Refresh and try again." },
          409,
        );
    } else return respond(request, { error: "That Password Vault change was not valid." }, 400);
    return respond(request, { snapshot: await loadPasswordVault(auth.admin, auth.user.id) });
  } catch {
    return respond(request, { error: "Password Vault could not be updated." }, 503);
  }
}
