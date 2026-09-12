import type { SupabaseClient, User } from "@supabase/supabase-js";

// getUser authenticates identity; verified JWT claims establish this session's MFA.
export async function hasVaultAssurance(client: SupabaseClient, user: User, token?: string) {
  try {
    const { data, error } = await client.auth.getClaims(token);
    return (
      !error &&
      data?.claims.sub === user.id &&
      data.claims.aal === "aal2" &&
      Boolean(user.factors?.some((factor) => factor.status === "verified"))
    );
  } catch {
    return false;
  }
}
