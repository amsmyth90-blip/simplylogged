import { timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";

import { EmailImportFailure, importInboundAttachment } from "@/lib/email-import/import-attachment";
import {
  asString,
  hasAnyResendSignature,
  hasCompleteResendSignature,
  MAX_INBOUND_ATTACHMENTS,
  parseInboundPayload,
  parseResendPayload,
  ResendVerificationError
} from "@/lib/email-import/payload";
import { getInboundEmailSecret, verifyInboundEmailAddress } from "@/lib/inbound-email";
import { RequestBodyError } from "@/lib/http/bounded-body";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized(message = "DiaryDock email intake is not authorised.") {
  return NextResponse.json({ error: message }, { status: 401 });
}

function secretsMatch(supplied: string | null | undefined, expected: string) {
  if (!supplied) return false;
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes);
}

class EmailAuthorizationError extends Error {}
class EmailConfigurationError extends Error {}
class EmailRecipientError extends Error {}
class EmailRateLimitError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("DiaryDock email intake is busy. Please try again shortly.");
  }
}

async function authenticateAndParse(
  request: NextRequest,
  webhookSecret: string,
  resendApiKey: string | undefined,
  beforeAttachments: (recipientText: string) => Promise<void>
) {
  if (hasAnyResendSignature(request)) {
    if (!hasCompleteResendSignature(request)) throw new EmailAuthorizationError("DiaryDock could not verify this Resend webhook.");
    if (!resendApiKey) throw new EmailConfigurationError("Resend API access is not configured yet.");
    return parseResendPayload(request, new Resend(resendApiKey), webhookSecret, beforeAttachments);
  }
  const suppliedSecret = request.headers.get("x-diarydock-webhook-secret") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secretsMatch(suppliedSecret, webhookSecret)) throw new EmailAuthorizationError();
  return parseInboundPayload(request, beforeAttachments);
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim() ?? process.env.DIARYDOCK_INBOUND_WEBHOOK_SECRET?.trim();
  const inboundSecret = getInboundEmailSecret();
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!webhookSecret || !inboundSecret || !isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "DiaryDock email forwarding is not fully configured yet." }, { status: 503 });
  }

  let userId: string | null = null;
  const authorizeRecipient = async (recipientText: string) => {
    const verifiedUserId = verifyInboundEmailAddress(recipientText, inboundSecret);
    if (!verifiedUserId) throw new EmailRecipientError("No valid DiaryDock forwarding address was found.");
    const rateLimit = await checkServerRateLimit(createRateLimitKey("inbound-email", verifiedUserId), { limit: 20, windowMs: 10 * 60 * 1000 });
    if (!rateLimit.allowed) throw new EmailRateLimitError(rateLimit.retryAfterSeconds);
    userId = verifiedUserId;
  };

  let parsedPayload: Awaited<ReturnType<typeof parseInboundPayload>> | null;
  try {
    parsedPayload = await authenticateAndParse(request, webhookSecret, resendApiKey, authorizeRecipient);
  } catch (error) {
    if (error instanceof EmailConfigurationError) return NextResponse.json({ error: error.message }, { status: 503 });
    if (error instanceof EmailAuthorizationError) return unauthorized(error.message || undefined);
    if (error instanceof ResendVerificationError) return unauthorized(error.message);
    if (error instanceof EmailRecipientError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof EmailRateLimitError) return NextResponse.json({ error: error.message }, { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } });
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
  if (!parsedPayload) return NextResponse.json({ ok: true, skipped: true });

  const { payload, recipientText, attachments } = parsedPayload;
  if (!userId) return NextResponse.json({ error: "No valid DiaryDock forwarding address was found." }, { status: 400 });
  if (!attachments.length) return NextResponse.json({ error: "No supported attachments were found to import." }, { status: 400 });

  const subject = asString(payload.subject).trim();
  const sender = asString(payload.from) || asString(payload.sender) || "Forwarded email";
  const saved: { id: string; title: string }[] = [];
  const skippedDuplicates: { id: string; title: string }[] = [];
  const skippedStorageLimit: { title: string }[] = [];

  for (const attachment of attachments.slice(0, MAX_INBOUND_ATTACHMENTS)) {
    try {
      const result = await importInboundAttachment({ attachment, recipientText, sender, subject, userId });
      if (result.status === "saved") saved.push(result.item);
      else if (result.status === "duplicate") skippedDuplicates.push(result.item);
      else if (result.status === "storage-limit") skippedStorageLimit.push(result.item);
    } catch (error) {
      if (error instanceof EmailImportFailure) return NextResponse.json({ error: error.message }, { status: 500 });
      throw error;
    }
  }

  if (!saved.length && skippedDuplicates.length) return NextResponse.json({ ok: true, saved, skippedDuplicates, skippedStorageLimit });
  if (!saved.length && skippedStorageLimit.length) return NextResponse.json({ ok: true, saved, skippedDuplicates, skippedStorageLimit, storageLimitReached: true });
  if (!saved.length) return NextResponse.json({ error: "No supported PDF or image attachments were found." }, { status: 400 });
  return NextResponse.json({ ok: true, saved, skippedDuplicates, skippedStorageLimit });
}
