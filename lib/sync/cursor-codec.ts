import { createHmac, timingSafeEqual } from "node:crypto";

const zero = BigInt(0);
const maximumSequence = BigInt("9223372036854775807");
const subjectPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function scopeFingerprint(scopeKey: string | null, secret: string) {
  if (scopeKey !== null && (scopeKey.length < 1 || scopeKey.length > 256)) {
    throw new Error("The sync scope is invalid.");
  }
  return createHmac("sha256", secret)
    .update(scopeKey === null ? "scope:user" : `scope:household:${scopeKey}`)
    .digest("base64url");
}

function assertSecret(secret: string) {
  if (secret.length < 32) throw new Error("The sync cursor secret is not configured securely.");
  return secret;
}

function assertSubject(subject: string) {
  if (!subjectPattern.test(subject)) throw new Error("The sync cursor subject is invalid.");
  return subject.toLowerCase();
}

export function encodeSyncCursor(
  sequence: bigint,
  subject: string,
  secret: string,
  scopeKey: string | null = null,
) {
  if (sequence < zero || sequence > maximumSequence) throw new Error("The sync sequence is invalid.");
  const checkedSecret = assertSecret(secret);
  const payload = Buffer.from(JSON.stringify({
    v: 3,
    s: sequence.toString(),
    u: assertSubject(subject),
    h: scopeFingerprint(scopeKey, checkedSecret),
  })).toString("base64url");
  return `${payload}.${signature(payload, checkedSecret)}`;
}

export function decodeSyncCursor(
  cursor: string | null,
  subject: string,
  secret: string,
  scopeKey: string | null = null,
) {
  const expectedSubject = assertSubject(subject);
  const checkedSecret = assertSecret(secret);
  const expectedScope = scopeFingerprint(scopeKey, checkedSecret);
  if (!cursor) return zero;
  if (cursor.length > 2_048) throw new Error("The sync cursor is invalid.");
  const [payload, supplied, extra] = cursor.split(".");
  if (!payload || !supplied || extra) throw new Error("The sync cursor is invalid.");
  const expected = signature(payload, checkedSecret);
  const suppliedBytes = Buffer.from(supplied, "base64url");
  const expectedBytes = Buffer.from(expected, "base64url");
  if (suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) {
    throw new Error("The sync cursor is invalid.");
  }
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as unknown;
    if (!value || typeof value !== "object") throw new Error();
    const parsed = value as { v?: unknown; s?: unknown; u?: unknown; h?: unknown };
    if ((parsed.v !== 2 && parsed.v !== 3) || parsed.u !== expectedSubject
      || typeof parsed.s !== "string" || !/^(0|[1-9][0-9]{0,18})$/.test(parsed.s)) {
      throw new Error();
    }
    const sequence = BigInt(parsed.s);
    if (sequence > maximumSequence) throw new Error();
    if (parsed.v === 2) return scopeKey === null ? sequence : zero;
    if (typeof parsed.h !== "string" || parsed.h.length !== expectedScope.length) throw new Error();
    if (parsed.h !== expectedScope) return zero;
    return sequence;
  } catch {
    throw new Error("The sync cursor is invalid.");
  }
}

export function assertSyncCursorSecret(secret: string) {
  return assertSecret(secret);
}
