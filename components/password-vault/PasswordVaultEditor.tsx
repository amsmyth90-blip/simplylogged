"use client";

import { useState, type FormEvent } from "react";
import { generatePassword, type VaultCredential } from "@diarydock/password-vault";

type Draft = Omit<VaultCredential, "createdAt" | "updatedAt">;
const blank = (): Draft => ({
  id: crypto.randomUUID(),
  name: "",
  username: "",
  password: "",
  website: "",
  notes: "",
});

export function PasswordVaultEditor(props: {
  value: VaultCredential | null;
  busy: boolean;
  onClose: () => void;
  onSave: (value: Draft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Draft>(() =>
    props.value
      ? {
          id: props.value.id,
          name: props.value.name,
          username: props.value.username,
          password: props.value.password,
          website: props.value.website,
          notes: props.value.notes,
        }
      : blank(),
  );
  const [revealed, setRevealed] = useState(false),
    [error, setError] = useState<string | null>(null);
  const change = (field: keyof Draft, value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!draft.name.trim()) {
      setError("Add a name for this account.");
      return;
    }
    try {
      await props.onSave({ ...draft, name: draft.name.trim() });
      props.onClose();
    } catch {
      /* The workspace displays server and encryption errors. */
    }
  }
  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-[#14271f]/45 p-3 backdrop-blur-sm sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vault-editor-title"
    >
      <form onSubmit={submit} className="mx-auto max-w-2xl rounded-[28px] bg-[#fffef9] p-5 shadow-2xl sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#6b826f]">Encrypted item</p>
            <h2 id="vault-editor-title" className="mt-1 font-serif text-3xl text-[#20352a]">
              {props.value ? "Edit account" : "Add account"}
            </h2>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="h-11 rounded-xl px-4 font-semibold text-[#506158]"
          >
            Close
          </button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field
            label="Account or service"
            value={draft.name}
            onChange={(value) => change("name", value)}
            required
            maxLength={160}
            autoComplete="off"
          />
          <Field
            label="Username or email"
            value={draft.username}
            onChange={(value) => change("username", value)}
            maxLength={512}
            autoComplete="off"
          />
          <label className="block text-sm font-semibold text-[#294536] sm:col-span-2">
            Password
            <div className="mt-2 flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-2xl border border-[#284735]/20 bg-white px-4 py-3 outline-none focus:border-[#47745b]"
                aria-label="Password"
              type={revealed ? "text" : "password"}
                autoComplete="new-password"
                value={draft.password}
                onChange={(event) => change("password", event.target.value)}
                maxLength={2048}
              />
              <button
                type="button"
                className="rounded-xl border border-[#284735]/15 px-3 font-semibold"
                onClick={() => setRevealed((value) => !value)}
              >
                {revealed ? "Hide" : "Show"}
              </button>
              <button
                type="button"
                className="rounded-xl bg-[#e8f0e6] px-3 font-semibold text-[#315443]"
                onClick={() => {
                  change("password", generatePassword());
                  setRevealed(true);
                }}
              >
                Generate
              </button>
            </div>
          </label>
          <Field
            label="Website"
            value={draft.website}
            onChange={(value) => change("website", value)}
            autoComplete="off"
          />
          <label className="block text-sm font-semibold text-[#294536] sm:col-span-2">
            Private notes
            <textarea
              className="mt-2 min-h-28 w-full resize-y rounded-2xl border border-[#284735]/20 bg-white px-4 py-3 outline-none focus:border-[#47745b]"
              value={draft.notes}
              onChange={(event) => change("notes", event.target.value)}
              maxLength={8192}
            />
          </label>
        </div>
        {error ? (
          <p role="alert" className="mt-4 text-sm font-semibold text-[#a03f35]">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={props.onClose}
            className="min-h-11 rounded-2xl border border-[#284735]/15 px-5 font-semibold"
          >
            Cancel
          </button>
          <button
            disabled={props.busy}
            className="min-h-11 rounded-2xl bg-[#274c39] px-6 font-bold text-white disabled:opacity-60"
          >
            {props.busy ? "Encrypting…" : "Encrypt and save"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoComplete: string;
  maxLength?: number;
}) {
  return (
    <label className="block text-sm font-semibold text-[#294536]">
      {props.label}
      <input
        className="mt-2 w-full rounded-2xl border border-[#284735]/20 bg-white px-4 py-3 outline-none focus:border-[#47745b]"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        required={props.required}
        autoComplete={props.autoComplete}
        maxLength={props.maxLength ?? 2048}
      />
    </label>
  );
}
