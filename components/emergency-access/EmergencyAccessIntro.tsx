import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";

import type { EmergencyAccessController } from "./useEmergencyAccess";

export function EmergencyAccessIntro({
  access,
}: {
  access: EmergencyAccessController;
}) {
  return (
    <>
      <section className="estate-sheet p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8efe5] text-[#52705a]">
            <UiIcon name="shield" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-serif text-xl">A narrow emergency view</h2>
            <p className="mt-1 text-sm leading-6 text-[#667068]">
              Trusted people never receive your whole account or Vault.
              Invitations expire after 14 days, must be accepted by the invited
              email, and changes require a recent sign-in.
            </p>
          </div>
        </div>
      </section>
      {access.error ? (
        <div
          role="alert"
          className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {access.error}
          {access.error.includes("sign in again") ? (
            <Link href="/login" className="ml-2 font-semibold underline">
              Sign in again
            </Link>
          ) : null}
        </div>
      ) : null}
      {access.inviteUrl ? <InvitationSecret access={access} /> : null}
    </>
  );
}

function InvitationSecret({ access }: { access: EmergencyAccessController }) {
  return (
    <section className="rounded-[22px] border border-[#d8c9ad] bg-[#f4ead7] p-4">
      <h2 className="text-sm font-semibold">Copy this invitation now</h2>
      <p className="mt-1 text-xs leading-5 text-[#6f604a]">
        For safety, the private invitation secret is shown only once. Send it to
        the named person using a channel you trust.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          readOnly
          value={access.inviteUrl}
          className="min-w-0 flex-1 rounded-xl border border-[#6f604a]/15 bg-white px-3 text-xs"
        />
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(access.inviteUrl)}
          className="min-h-11 rounded-xl bg-[#315443] px-4 text-xs font-semibold text-white"
        >
          Copy link
        </button>
      </div>
      <button
        type="button"
        onClick={() => access.setInviteUrl("")}
        className="mt-2 text-xs font-semibold text-[#6f604a] underline"
      >
        I have saved it
      </button>
    </section>
  );
}
