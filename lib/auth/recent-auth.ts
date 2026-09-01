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
