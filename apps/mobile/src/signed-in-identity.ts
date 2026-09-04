import type { useMobileSession } from "@mobile/auth/use-mobile-session";

export type SignedInState = Extract<
  ReturnType<typeof useMobileSession>["state"],
  { status: "SIGNED_IN" }
>;

export function signedInFirstName(state: SignedInState) {
  const metadata = state.session.user.user_metadata;
  const candidate =
    metadata.given_name ?? metadata.first_name ?? metadata.full_name;
  if (typeof candidate === "string" && candidate.trim()) {
    return candidate.trim().split(/\s+/)[0] ?? "";
  }
  return state.session.user.email?.split("@")[0] ?? "";
}
