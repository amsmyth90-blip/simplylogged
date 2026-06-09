import Link from "next/link";
import { ArrowLeft, Lock, Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <main className="min-h-svh bg-zinc-950 px-4 py-5 text-white">
      <div className="mx-auto max-w-md">
        <Link href="/dashboard" className="inline-grid h-11 w-11 place-items-center rounded-full bg-white/10" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="mt-6">
          <Settings className="h-9 w-9 text-violet-300" />
          <h1 className="mt-4 text-3xl font-bold">Front Gate</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Security, readiness, trusted access, and account preferences for the estate.
          </p>
        </div>
        <section className="mt-6 rounded-[1.75rem] bg-white/10 p-5 ring-1 ring-white/15">
          <Lock className="h-6 w-6 text-emerald-300" />
          <h2 className="mt-3 font-bold">Estate security</h2>
          <p className="mt-1 text-sm text-zinc-300">Two-factor authentication is enabled. Readiness is 94%.</p>
        </section>
      </div>
    </main>
  );
}
