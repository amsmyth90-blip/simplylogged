"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { checkSharedRateLimit, createRateLimitKey, getForwardedClientIp } from "@/lib/rate-limit";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=Please%20enter%20your%20email%20and%20password");
  }

  const requestHeaders = await headers();
  const clientIp = getForwardedClientIp(requestHeaders);
  const supabase = await getSupabaseServerClient();
  const rateLimit = await checkSharedRateLimit(supabase, createRateLimitKey("auth:signin", clientIp, email.toLowerCase()), {
    limit: 8,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    redirect("/login?error=Too%20many%20sign-in%20attempts.%20Please%20wait%20a%20moment%20and%20try%20again.");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
