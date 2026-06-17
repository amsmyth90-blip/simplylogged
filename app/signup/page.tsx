"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { getSupabaseClient, getSupabaseConfigurationError, isSupabaseConfigured } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function signUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const configError = getSupabaseConfigurationError();
    if (configError) {
      setMessage(configError);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setMessage("Supabase is not configured yet. Local fallback storage is still active.");
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setIsSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        email,
      });

      if (profileError) {
        console.warn("Profile upsert failed after signup; database trigger remains source of truth.", profileError);
        setMessage("Account created. Supabase will finish setting up your profile automatically.");
        window.setTimeout(() => router.push("/account"), 900);
        return;
      }
    }

    router.push("/account");
  }

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top,#f5f3ff_0,#f8fafc_36%,#e9eef8_100%)] px-4 py-6 text-zinc-950">
      <section className="mx-auto max-w-md rounded-[1.75rem] bg-white p-5 shadow-xl shadow-slate-300/40">
        <p className="text-sm font-bold text-violet-700">Simply Logged</p>
        <h1 className="mt-2 text-3xl font-bold">Create account</h1>
        <p className="mt-2 text-sm text-zinc-600">Start syncing your vault to Supabase.</p>
        <form onSubmit={signUp} className="mt-6 grid gap-3">
          <label className="grid gap-1 text-sm font-bold text-zinc-700">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm font-semibold outline-none ring-1 ring-zinc-200 focus:ring-violet-400"
            />
          </label>
          <label className="grid gap-1 text-sm font-bold text-zinc-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm font-semibold outline-none ring-1 ring-zinc-200 focus:ring-violet-400"
            />
          </label>
          <button className="mt-2 flex items-center justify-center gap-2 rounded-full bg-violet-600 px-5 py-4 text-sm font-bold text-white disabled:bg-zinc-300" disabled={isSubmitting}>
            <UserPlus className="h-5 w-5" />
            {isSubmitting ? "Creating account..." : "Sign up"}
          </button>
        </form>
        {message || getSupabaseConfigurationError() ? (
          <p className="mt-4 rounded-2xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-800">{message || getSupabaseConfigurationError()}</p>
        ) : !isSupabaseConfigured() ? (
          <p className="mt-4 rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-600">Supabase env vars are missing, so the app is using local fallback storage.</p>
        ) : null}
        <p className="mt-5 text-center text-sm text-zinc-600">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-violet-700">
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}
