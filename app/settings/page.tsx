"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, LogOut, Settings, UserCircle } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

const preferenceKey = "simplyLoggedPreferences";

type Preferences = {
  theme: "system" | "light" | "dark";
  season: "spring" | "summer" | "autumn" | "winter";
  emergencyAccess: boolean;
};

const defaultPreferences: Preferences = {
  theme: "system",
  season: "summer",
  emergencyAccess: false,
};

export default function SettingsPage() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const raw = window.localStorage.getItem(preferenceKey);
    if (raw) {
      queueMicrotask(() => {
        setPreferences({ ...defaultPreferences, ...(JSON.parse(raw) as Partial<Preferences>) });
      });
    }
  }, []);

  function updatePreferences(next: Preferences) {
    setPreferences(next);
    window.localStorage.setItem(preferenceKey, JSON.stringify(next));
    setMessage("Preferences saved.");
  }

  async function signOut() {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
      router.push("/dashboard");
      return;
    }

    setMessage("Local mode is active. There is no Supabase session to sign out from.");
  }

  return (
    <main className="min-h-svh bg-[#f5efe6] px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-5 text-[#261c14]">
      <div className="mx-auto max-w-md">
        <Link href="/dashboard" className="inline-grid h-11 w-11 place-items-center rounded-full bg-white shadow-sm" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="mt-6">
          <Settings className="h-9 w-9 text-violet-700" />
          <h1 className="mt-4 text-3xl font-bold">Front Gate</h1>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Security, readiness, trusted access, and account preferences for the estate.
          </p>
        </div>

        <section className="mt-6 rounded-[1.75rem] bg-white p-5 shadow-sm shadow-stone-200">
          <Lock className="h-6 w-6 text-emerald-600" />
          <h2 className="mt-3 font-bold">Estate security</h2>
          <p className="mt-1 text-sm text-stone-600">
            {isSupabaseConfigured() ? "Supabase auth is available." : "Local mode is active until Supabase env vars are added."}
          </p>
          <div className="mt-4 grid gap-2">
            <Link href="/account" className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-stone-950 px-4 text-sm font-bold text-white">
              <UserCircle className="h-5 w-5" />
              Account
            </Link>
            <button onClick={signOut} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#fbf7ef] px-4 text-sm font-bold text-stone-900">
              <LogOut className="h-5 w-5" />
              Sign out
            </button>
          </div>
        </section>

        <section className="mt-4 rounded-[1.75rem] bg-white p-5 shadow-sm shadow-stone-200">
          <h2 className="font-bold">Display</h2>
          <label className="mt-4 grid gap-2 text-sm font-bold text-stone-600">
            Theme
            <select
              value={preferences.theme}
              onChange={(event) => updatePreferences({ ...preferences, theme: event.target.value as Preferences["theme"] })}
              className="min-h-12 rounded-2xl bg-[#fbf7ef] px-4 text-stone-950 outline-none"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label className="mt-3 grid gap-2 text-sm font-bold text-stone-600">
            Estate season
            <select
              value={preferences.season}
              onChange={(event) => updatePreferences({ ...preferences, season: event.target.value as Preferences["season"] })}
              className="min-h-12 rounded-2xl bg-[#fbf7ef] px-4 text-stone-950 outline-none"
            >
              <option value="spring">Spring</option>
              <option value="summer">Summer</option>
              <option value="autumn">Autumn</option>
              <option value="winter">Winter</option>
            </select>
          </label>
        </section>

        <section className="mt-4 rounded-[1.75rem] bg-white p-5 shadow-sm shadow-stone-200">
          <div className="flex min-h-12 items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">Emergency access</h2>
              <p className="mt-1 text-sm text-stone-500">Store preference locally for this prototype.</p>
            </div>
            <button
              onClick={() => updatePreferences({ ...preferences, emergencyAccess: !preferences.emergencyAccess })}
              className={`h-8 w-14 rounded-full p-1 transition ${preferences.emergencyAccess ? "bg-emerald-600" : "bg-stone-300"}`}
              aria-pressed={preferences.emergencyAccess}
            >
              <span className={`block h-6 w-6 rounded-full bg-white transition ${preferences.emergencyAccess ? "translate-x-6" : ""}`} />
            </button>
          </div>
        </section>

        {message ? (
          <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</p>
        ) : null}
      </div>
      <BottomNav />
    </main>
  );
}
