"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const supabase = getSupabaseClient();
    if (!supabase) {
      setMessage("Supabase is not configured yet. Local fallback storage is still active.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/account");
  }

  return (
    <AuthShell title="Log in" subtitle="Access your Simply Logged vault.">
      <form onSubmit={signIn} className="mt-6 grid gap-3">
        <AuthInput label="Email" type="email" value={email} onChange={setEmail} />
        <AuthInput label="Password" type="password" value={password} onChange={setPassword} />
        <button className="mt-2 flex items-center justify-center gap-2 rounded-full bg-violet-600 px-5 py-4 text-sm font-bold text-white disabled:bg-zinc-300" disabled={isSubmitting}>
          <LogIn className="h-5 w-5" />
          {isSubmitting ? "Signing in..." : "Log in"}
        </button>
      </form>
      <FooterMessage message={message} configured={isSupabaseConfigured()} />
      <p className="mt-5 text-center text-sm text-zinc-600">
        New here?{" "}
        <Link href="/signup" className="font-bold text-violet-700">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top,#f5f3ff_0,#f8fafc_36%,#e9eef8_100%)] px-4 py-6 text-zinc-950">
      <section className="mx-auto max-w-md rounded-[1.75rem] bg-white p-5 shadow-xl shadow-slate-300/40">
        <p className="text-sm font-bold text-violet-700">Simply Logged</p>
        <h1 className="mt-2 text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-zinc-600">{subtitle}</p>
        {children}
      </section>
    </main>
  );
}

function AuthInput({
  label,
  type,
  value,
  onChange,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold text-zinc-700">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm font-semibold outline-none ring-1 ring-zinc-200 focus:ring-violet-400"
      />
    </label>
  );
}

function FooterMessage({ message, configured }: { message: string; configured: boolean }) {
  if (message) {
    return <p className="mt-4 rounded-2xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-800">{message}</p>;
  }

  if (!configured) {
    return <p className="mt-4 rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-600">Supabase env vars are missing, so the app is using local fallback storage.</p>;
  }

  return null;
}
