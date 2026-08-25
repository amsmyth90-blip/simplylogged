import Link from "next/link";
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
  const message = readParam(params.message);
  const authReady = isSupabaseConfiguredServer();

  return (
    <section className="flex flex-1 items-center justify-center py-8">
      <div className="w-full max-w-md overflow-hidden rounded-[32px] border border-white/75 bg-[#fffdf8]/90 shadow-[0_30px_80px_-40px_rgba(32,53,42,0.45)] backdrop-blur-xl">
        <div className="border-b border-[#20352a]/10 bg-[radial-gradient(circle_at_top,_rgba(255,253,248,0.98),_rgba(245,244,237,0.92)_58%,_rgba(221,230,216,0.7))] px-6 pb-7 pt-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#667068]">DiaryDock</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#20352a]">Welcome back</h1>
          <p className="mt-3 text-sm leading-6 text-[#667068]">
            Sign in to your digital home for everyday life.
          </p>
        </div>

        <div className="space-y-5 px-6 py-6">
          {!authReady ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Authentication is not configured yet. Add the Supabase URL and publishable key to continue.
            </div>
          ) : null}

          {message ? (
            <div className="rounded-3xl border border-[#dbe6d8] bg-[#f3f8ef] px-4 py-3 text-sm text-[#20352a]">{message}</div>
          ) : null}

          {error ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : null}

          <form action={signInAction} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-[#20352a]">Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                className="w-full rounded-2xl border border-[#20352a]/10 bg-white px-4 py-3 text-sm text-[#20352a] outline-none transition focus:border-[#6f8e72] focus:ring-4 focus:ring-[#dde6d8]"
                placeholder="you@example.com"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-[#20352a]">Password</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                className="w-full rounded-2xl border border-[#20352a]/10 bg-white px-4 py-3 text-sm text-[#20352a] outline-none transition focus:border-[#6f8e72] focus:ring-4 focus:ring-[#dde6d8]"
                placeholder="Your password"
              />
            </label>

            <button
              type="submit"
              disabled={!authReady}
              className="w-full rounded-2xl bg-[#20352a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2f4b3c] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Sign in
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <Link href="/forgot-password" className="inline-flex min-h-11 items-center font-semibold text-[#486a50] underline-offset-4 hover:underline">
              Forgot password?
            </Link>
            <Link href="/signup" className="inline-flex min-h-11 items-center font-semibold text-[#486a50] underline-offset-4 hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
