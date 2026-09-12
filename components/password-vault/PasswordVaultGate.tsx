"use client";

import { useState, type FormEvent } from "react";

export function PasswordVaultGate(props: {
  exists: boolean;
  busy: boolean;
  onUnlock: (passphrase: string) => Promise<void>;
  onCreate: (passphrase: string) => Promise<void>;
}) {
  const [passphrase, setPassphrase] = useState(""),
    [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);
    if (!props.exists && passphrase !== confirm) {
      setLocalError("The two vault passphrases do not match.");
      return;
    }
    if (passphrase.length < 15) {
      setLocalError("Use at least 15 characters.");
      return;
    }
    try {
      if (props.exists) await props.onUnlock(passphrase);
      else await props.onCreate(passphrase);
      setPassphrase("");
      setConfirm("");
    } catch {
      /* The workspace presents the safe error returned by the vault. */
    }
  }
  return (
    <section className="mx-auto max-w-xl rounded-[30px] border border-[#284735]/12 bg-white/85 p-6 shadow-[0_24px_70px_-45px_rgba(27,62,42,.45)] sm:p-9">
      <span
        className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#274c39] text-2xl text-white"
        aria-hidden="true"
      >
        ⌾
      </span>
      <h2 className="mt-5 font-serif text-3xl text-[#20352a]">
        {props.exists ? "Unlock your vault" : "Create your password vault"}
      </h2>
      <p className="mt-3 text-sm leading-6 text-[#5c6b61]">
        {props.exists
          ? "Your vault passphrase unlocks passwords on this device. DiaryDock never receives it."
          : "Choose a separate passphrase you can remember. DiaryDock cannot recover it because only encrypted data is stored."}
      </p>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block text-sm font-semibold text-[#294536]">
          Vault passphrase
          <input
            className="mt-2 w-full rounded-2xl border border-[#284735]/20 bg-white px-4 py-3 outline-none focus:border-[#47745b] focus:ring-2 focus:ring-[#47745b]/15"
            type="password"
            autoComplete={props.exists ? "current-password" : "new-password"}
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
            maxLength={256}
            autoFocus
          />
        </label>
        {!props.exists ? (
          <label className="block text-sm font-semibold text-[#294536]">
            Confirm passphrase
            <input
              className="mt-2 w-full rounded-2xl border border-[#284735]/20 bg-white px-4 py-3 outline-none focus:border-[#47745b] focus:ring-2 focus:ring-[#47745b]/15"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              maxLength={256}
            />
          </label>
        ) : null}
        {localError ? (
          <p className="text-sm font-semibold text-[#a03f35]" role="alert">
            {localError}
          </p>
        ) : null}
        <button
          className="min-h-12 w-full rounded-2xl bg-[#274c39] px-5 font-bold text-white transition hover:bg-[#1d3d2d] disabled:opacity-60"
          disabled={props.busy}
        >
          {props.busy ? "Securing…" : props.exists ? "Unlock vault" : "Create encrypted vault"}
        </button>
      </form>
    </section>
  );
}
