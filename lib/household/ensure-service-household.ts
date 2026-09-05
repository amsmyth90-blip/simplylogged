import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export async function ensureServiceHousehold(
  admin: SupabaseClient,
  userId: string,
  householdName: string,
  displayName: string,
) {
  const result = await admin.rpc("ensure_service_user_household", {
    input_display_name: displayName,
    input_household_name: householdName,
    input_user_id: userId,
  });
  return !result.error && typeof result.data === "string" && result.data.length > 0;
}
