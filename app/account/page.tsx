"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function AccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [configured] = useState(isSupabaseConfigured());

  useEffect(() => {
    async function loadUser() {
      const supabase = getSupabaseClient();
      if (!supabase) {
        return;
      }

      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? "");
    }

    loadUser();
  }, []);

  async function signOut() {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }

    router.push("/dashboard");
  }

  return (
    <main className="min-h-svh bg-zinc-950 px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-6 text-white">
      <section className="mx-auto max-w-md rounded-[1.75rem] bg-white/10 p-5 ring-1 ring-white/15">
        <ShieldCheck className="h-9 w-9 text-violet-300" />
        <h1 className="mt-4 text-3xl font-bold">Account</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          {configured
            ? email || "No signed-in user found."
            : "Supabase is not configured. Local fallback storage is active."}
        </p>
        <div className="mt-6 grid gap-3">
          {email ? (
            <button
              onClick={signOut}
              className="flex items-center justify-center gap-2 rounded-full bg-white px-5 py-4 text-sm font-bold text-zinc-950"
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
            className="rounded-full bg-white/10 px-5 py-4 text-center text-sm font-bold text-white ring-1 ring-white/15"
          >
            Back to estate
          </Link>
        </div>
      </section>
      <BottomNav />
    </main>
  );
}
