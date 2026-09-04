"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { checkServerRateLimit, createRateLimitKey, getForwardedClientIp } from "@/lib/rate-limit-server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function getRequestOrigin(requestHeaders: Headers) {
  const origin = requestHeaders.get("origin");
  if (origin) return origin;

  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const host = requestHeaders.get("host");
  return host ? `${protocol}://${host}` : "https://diarydock.com";
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=Please%20enter%20your%20email%20and%20password");
  }

  const requestHeaders = await headers();
  const clientIp = getForwardedClientIp(requestHeaders);
  const supabase = await getSupabaseServerClient();
  const rateLimit = await checkServerRateLimit(createRateLimitKey("auth:signin", clientIp, email.toLowerCase()), {
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

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!email || !password || !confirmPassword) {
    redirect("/signup?error=Please%20enter%20your%20email%20and%20password");
  }

  if (password.length < 8) {
    redirect("/signup?error=Please%20use%20a%20password%20with%20at%20least%208%20characters");
  }

  if (password !== confirmPassword) {
    redirect("/signup?error=The%20passwords%20do%20not%20match");
  }

  const requestHeaders = await headers();
  const clientIp = getForwardedClientIp(requestHeaders);
  const supabase = await getSupabaseServerClient();
  const rateLimit = await checkServerRateLimit(createRateLimitKey("auth:signup", clientIp, email.toLowerCase()), {
    limit: 5,
    windowMs: 30 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    redirect("/signup?error=Too%20many%20account%20attempts.%20Please%20wait%20a%20moment%20and%20try%20again.");
  }

  const origin = getRequestOrigin(requestHeaders);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/onboarding`
    }
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (data.session) {
    redirect("/onboarding");
  }

  redirect("/login?message=Check%20your%20email%20to%20confirm%20your%20DiaryDock%20account.");
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirect("/forgot-password?error=Please%20enter%20your%20email%20address");
  }

  const requestHeaders = await headers();
  const clientIp = getForwardedClientIp(requestHeaders);
  const supabase = await getSupabaseServerClient();
  const rateLimit = await checkServerRateLimit(createRateLimitKey("auth:reset", clientIp, email.toLowerCase()), {
    limit: 5,
    windowMs: 30 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    redirect("/forgot-password?error=Too%20many%20reset%20requests.%20Please%20wait%20a%20moment%20and%20try%20again.");
  }

  const origin = getRequestOrigin(requestHeaders);
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`
  });

  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?message=If%20that%20email%20exists,%20we%20sent%20a%20password%20reset%20link.");
}

export async function updatePasswordAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!password || !confirmPassword) {
    redirect("/reset-password?error=Please%20enter%20your%20new%20password");
  }

  if (password.length < 8) {
    redirect("/reset-password?error=Please%20use%20a%20password%20with%20at%20least%208%20characters");
  }

  if (password !== confirmPassword) {
    redirect("/reset-password?error=The%20passwords%20do%20not%20match");
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.auth.signOut();
  redirect("/login?message=Your%20password%20has%20been%20updated.%20Please%20sign%20in.");
}

export async function signOutAction() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
