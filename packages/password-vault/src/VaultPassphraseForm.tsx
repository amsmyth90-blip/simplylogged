"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import "./vault-passphrase-form.css";

type Props = {
  exists: boolean;
  busy: boolean;
  onUnlock: (passphrase: string) => Promise<void>;
  onCreate: (passphrase: string) => Promise<void>;
};

function PassphraseField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  name: string;
  disabled: boolean;
  describedBy?: string;
  invalid?: boolean;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className="vault-passphrase-field">
      <label htmlFor={id}>{props.label}</label>
      <div className="vault-passphrase-input">
        <input id={id} name={props.name} type={visible ? "text" : "password"}
          value={props.value} onChange={(event) => props.onChange(event.target.value)}
          autoComplete={props.autoComplete} autoCapitalize="none" spellCheck={false}
          maxLength={256} disabled={props.disabled}
          aria-describedby={props.describedBy} aria-invalid={props.invalid || undefined} />
        <button type="button" className="vault-passphrase-eye" disabled={props.disabled}
          aria-label={`${visible ? "Hide" : "Show"} ${props.label.toLowerCase()}`}
          aria-pressed={visible} aria-controls={id} onClick={() => setVisible(!visible)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {visible && <path d="m3 3 18 18" />}
          </svg>
        </button>
      </div>
    </div>
  );
}

export function VaultPassphraseForm(props: Props) {
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  const lengthId = useId();
  const matchId = useId();
  const longEnough = passphrase.length >= 15;
  const matches = confirm === passphrase;
  const busy = props.busy || submitting;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (props.busy || inFlight.current) return;
    setError(null);
    if (!longEnough) {
      setError("Add at least 15 characters to your vault passphrase.");
      event.currentTarget.querySelector<HTMLInputElement>('[name="passphrase"]')?.focus();
      return;
    }
    if (!props.exists && !matches) {
      setError("The two vault passphrases do not match.");
      event.currentTarget.querySelector<HTMLInputElement>('[name="confirm"]')?.focus();
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    try {
      // Let the pressed/loading state paint before the key derivation starts.
      await new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
      if (!active.current) return;
      if (props.exists) await props.onUnlock(passphrase);
      else await props.onCreate(passphrase);
      setPassphrase("");
      setConfirm("");
    } catch {
      // The parent displays the vault's safe error. Do not expose raw exceptions.
      setError(props.exists ? "Could not unlock your vault. Check your passphrase and try again."
        : "Your vault could not be created. Please try again.");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form className="vault-passphrase-form" onSubmit={submit} noValidate>
      <PassphraseField label="Vault passphrase" value={passphrase}
        onChange={(value) => { setPassphrase(value); setError(null); }}
        autoComplete={props.exists ? "current-password" : "new-password"}
        name="passphrase" disabled={busy} describedBy={lengthId}
        invalid={passphrase.length > 0 && !longEnough} />
      <p id={lengthId} className="vault-passphrase-hint" data-valid={longEnough} aria-live="polite">
        <span aria-hidden="true">{longEnough ? "✓" : "!"}</span>
        {longEnough ? `Minimum length reached (${passphrase.length} characters)`
          : `At least 15 characters (${passphrase.length}/15)`}
      </p>
      {!props.exists && <>
        <PassphraseField label="Confirm passphrase" value={confirm}
          onChange={(value) => { setConfirm(value); setError(null); }}
          autoComplete="new-password" name="confirm" disabled={busy}
          describedBy={confirm ? matchId : undefined} invalid={Boolean(confirm) && !matches} />
        {confirm && <p id={matchId} className="vault-passphrase-hint" data-valid={matches} aria-live="polite">
          <span aria-hidden="true">{matches ? "✓" : "!"}</span>
          {matches ? "Passphrases match" : "Passphrases do not match yet"}
        </p>}
      </>}
      {error && <p className="vault-passphrase-error" role="alert">{error}</p>}
      <button type="submit" className="vault-passphrase-submit" disabled={busy} aria-busy={busy}>
        {busy && <span className="vault-passphrase-spinner" aria-hidden="true" />}
        {busy ? (props.exists ? "Unlocking vault…" : "Creating encrypted vault…")
          : props.exists ? "Unlock vault" : "Create encrypted vault"}
      </button>
      {busy && <p className="vault-passphrase-progress" role="status">
        {props.exists ? "Unlocking on this device. Please wait." : "Encrypting on this device. Please wait."}
      </p>}
    </form>
  );
}
