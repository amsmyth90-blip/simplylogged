"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { InternalPageShell } from "@/components/InternalPageShell";
import { getSupabaseClient, getSupabaseConfigurationError, isSupabaseConfigured } from "@/lib/supabase/client";

export default function AccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [configured] = useState(isSupabaseConfigured());
  const [configError] = useState(getSupabaseConfigurationError);

  useEffect(() => {
    async function loadUser() {
      if (configError) {
        return;
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        return;
      }

      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? "");
    }

    loadUser();
  }, [configError]);

  async function signOut() {
    if (configError) {
      router.push("/setup");
      return;
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }

    router.push("/dashboard");
  }

  return (
    <InternalPageShell
      icon={ShieldCheck}
      eyebrow="Estate access"
      title="Account"
      subtitle="Manage sign-in, local mode, and your Simply Logged account state."
    >
      <section className="rounded-[1.75rem] bg-white p-5 shadow-sm shadow-stone-200">
        <p className="text-sm leading-6 text-stone-600">
          {configured
            ? email || "No signed-in user found."
            : configError || "Supabase is not configured. Local fallback storage is active."}
        </p>
        <div className="mt-6 grid gap-3">
          {email ? (
            <button
              onClick={signOut}
              className="flex items-center justify-center gap-2 rounded-full bg-stone-950 px-5 py-4 text-sm font-bold text-white"
            >
              <LogOut className="h-5 w-5" />
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-violet-600 px-5 py-4 text-center text-sm font-bold text-white"
            >
              Log in
            </Link>
          )}
          <Link
            href="/dashboard"
            className="rounded-full bg-[#fbf7ef] px-5 py-4 text-center text-sm font-bold text-stone-900"
          >
            Back to estate
          </Link>
        </div>
      </section>
    </InternalPageShell>
  );
}
