export const RECENT_AUTH_WINDOW_MS = 15 * 60 * 1000;

export function hasRecentAuthentication(
  lastSignInAt: string | null | undefined,
  now = Date.now(),
  maximumAgeMs = RECENT_AUTH_WINDOW_MS
) {
  if (!lastSignInAt) return false;
  const signedInAt = Date.parse(lastSignInAt);
  if (!Number.isFinite(signedInAt)) return false;
  const age = now - signedInAt;
  return age >= 0 && age <= maximumAgeMs;
}

const RECOVERY_METHODS = new Set(["recovery", "otp", "magiclink"]);

// A password may change only in a session the reset email just created.
export function hasRecentPasswordRecovery(
  claims: unknown,
  now = Date.now(),
  maximumAgeMs = RECENT_AUTH_WINDOW_MS
) {
  if (!claims || typeof claims !== "object") return false;
  const amr = Reflect.get(claims, "amr");
  if (!Array.isArray(amr)) return false;
  return amr.some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const method = Reflect.get(entry, "method");
    const timestamp = Reflect.get(entry, "timestamp");
    if (typeof method !== "string" || !RECOVERY_METHODS.has(method)) return false;
    if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) return false;
    const age = now - timestamp * 1000;
    return age >= 0 && age <= maximumAgeMs;
  });
}
