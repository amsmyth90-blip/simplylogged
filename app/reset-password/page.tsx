import Link from "next/link";
import { redirect } from "next/navigation";

import { updatePasswordAction } from "@/app/login/actions";
import { getAuthenticatedUser } from "@/lib/auth";

type ResetPasswordPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?message=Please%20open%20the%20password%20reset%20link%20from%20your%20email.");
  }

  const params = searchParams ? await searchParams : {};
  const error = readParam(params.error);

  return (
    <section className="flex min-h-[100svh] items-center justify-center py-8">
      <div className="w-full max-w-md overflow-hidden rounded-[32px] border border-white/75 bg-[#fffdf8]/90 shadow-[0_30px_80px_-40px_rgba(32,53,42,0.45)] backdrop-blur-xl">
        <div className="border-b border-[#20352a]/10 bg-[radial-gradient(circle_at_top,_rgba(255,253,248,0.98),_rgba(245,244,237,0.92)_58%,_rgba(221,230,216,0.7))] px-6 pb-7 pt-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#667068]">DiaryDock</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#20352a]">Choose a new password</h1>
          <p className="mt-3 text-sm leading-6 text-[#667068]">
            Keep it private and use at least 8 characters.
          </p>
        </div>

        <div className="space-y-5 px-6 py-6">
          {error ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : null}

          <form action={updatePasswordAction} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-[#20352a]">New password</span>
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                minLength={8}
                required
                className="w-full rounded-2xl border border-[#20352a]/10 bg-white px-4 py-3 text-sm text-[#20352a] outline-none transition focus:border-[#6f8e72] focus:ring-4 focus:ring-[#dde6d8]"
                placeholder="At least 8 characters"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-[#20352a]">Confirm password</span>
              <input
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                minLength={8}
                required
                className="w-full rounded-2xl border border-[#20352a]/10 bg-white px-4 py-3 text-sm text-[#20352a] outline-none transition focus:border-[#6f8e72] focus:ring-4 focus:ring-[#dde6d8]"
                placeholder="Repeat your password"
              />
            </label>

            <button type="submit" className="w-full rounded-2xl bg-[#20352a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2f4b3c]">
              Update password
            </button>
          </form>

          <Link href="/login" className="block text-center text-sm font-semibold text-[#486a50] underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </section>
  );
}
