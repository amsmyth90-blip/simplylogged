import { redirect } from "next/navigation";

import { signInAction } from "@/app/login/actions";
import { getAuthenticatedUser } from "@/lib/auth";
import { isSupabaseConfiguredServer } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getAuthenticatedUser();
  if (user) {
    redirect("/dashboard");
  }

  const params = searchParams ? await searchParams : {};
  const error = readParam(params.error);
  const authReady = isSupabaseConfiguredServer();

  return (
    <section className="flex min-h-[100svh] items-center justify-center py-8">
      <div className="w-full max-w-md overflow-hidden rounded-[32px] border border-white/70 bg-white/80 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <div className="border-b border-slate-200/70 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(241,245,249,0.88)_55%,_rgba(226,232,240,0.9))] px-6 pb-7 pt-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">LifeDock</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Sign in to your estate</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Secure access to your family dashboard, vault, reminders, and emergency records.
          </p>
        </div>

        <div className="space-y-5 px-6 py-6">
          {!authReady ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Supabase authentication is not configured yet. Add your Supabase URL and publishable key to continue.
            </div>
          ) : null}

          {error ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : null}

          <form action={signInAction} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-800">Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                placeholder="you@example.com"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-800">Password</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                placeholder="Your password"
              />
            </label>

            <button
              type="submit"
              disabled={!authReady}
              className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Sign in
            </button>
          </form>

          <div className="rounded-3xl bg-slate-50 px-4 py-4 text-xs leading-6 text-slate-600">
            Use a user account created in Supabase Auth. If you have not created one yet, add it in the Supabase dashboard
            under Authentication, then come back here to sign in.
          </div>
        </div>
      </div>
    </section>
  );
}
