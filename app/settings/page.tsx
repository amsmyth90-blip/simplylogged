"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, LogOut, Settings, UserCircle } from "lucide-react";
import { InternalPageShell } from "@/components/InternalPageShell";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { defaultPreferences, getPreferences, savePreferences, type UserPreferences } from "@/lib/supabase/preferences";

export default function SettingsPage() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadPreferences() {
      try {
        setPreferences(await getPreferences());
      } catch {
        setMessage("Could not load preferences.");
      }
    }

    loadPreferences();
  }, []);

  async function updatePreferences(next: UserPreferences) {
    setPreferences(next);
    try {
      await savePreferences(next);
      setMessage("Preferences saved.");
    } catch {
      setMessage("Could not save preferences. Please sign in and try again.");
    }
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
    <InternalPageShell
      icon={Settings}
      eyebrow="Front gate"
      title="Settings"
      subtitle="Security, readiness, trusted access, and account preferences for the estate."
    >
        <section className="rounded-[1.75rem] bg-white p-5 shadow-sm shadow-stone-200">
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
              onChange={(event) => updatePreferences({ ...preferences, theme: event.target.value as UserPreferences["theme"] })}
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
              onChange={(event) => updatePreferences({ ...preferences, season: event.target.value as UserPreferences["season"] })}
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
              <p className="mt-1 text-sm text-stone-500">Controls trusted access preferences for this estate.</p>
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
    </InternalPageShell>
  );
}
