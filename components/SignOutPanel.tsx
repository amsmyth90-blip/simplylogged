import { signOutAction } from "@/app/login/actions";

export function SignOutPanel() {
  return (
    <section className="space-y-3 pb-2">
      <form action={signOutAction}>
        <button
          type="submit"
          className="w-full rounded-[24px] border border-ink/10 bg-white/70 px-5 py-3.5 text-sm font-semibold text-ink/70 shadow-soft transition hover:bg-white"
        >
          Sign out
        </button>
      </form>
      <p className="text-center text-xs text-ink/35">
        Deleting your estate removes all sealed records after a 30-day grace period.
      </p>
    </section>
  );
}
