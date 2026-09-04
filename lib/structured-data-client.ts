"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function isMissingOptionalTableError(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? "";
  return error.code === "42P01" || message.includes("could not find the table") || message.includes("schema cache");
}

export async function getAuthenticatedUserId() {
  const client = getSupabaseBrowserClient();
  if (!client) return null;
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new Error("Please sign in again before saving.");
  return user.id;
}
