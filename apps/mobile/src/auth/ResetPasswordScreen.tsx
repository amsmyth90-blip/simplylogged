import { useState, type FormEvent } from "react";

import { BrandMark } from "@mobile/components/BrandMark";
import type { RecoveredPasswordUpdate } from "./auth-types";

export function ResetPasswordScreen(props: { error: string | null; onCancel: () => void;
  onUpdate: RecoveredPasswordUpdate }) {
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmPassword") ?? "");
    const error = password.length < 8 ? "Use a password with at least 8 characters."
      : password.length > 128 ? "Use a password with no more than 128 characters."
        : password !== confirmation ? "The passwords do not match." : null;
    setLocalError(error);
    if (error) return;
    setBusy(true);
    try { await props.onUpdate(password); }
    finally { setBusy(false); }
  }

  return <main className="mobile-shell"><section className="auth-card"
    aria-labelledby="reset-password-title"><header className="auth-card-header">
      <BrandMark /><p className="eyebrow">Secure recovery</p>
      <h1 id="reset-password-title">Choose a new password</h1>
      <p>Your reset link has been verified. Set the password for this account.</p>
    </header><form className="auth-form" onSubmit={submit}>
      {localError || props.error ? <p className="form-message form-error" role="alert">
        {localError ?? props.error}</p> : null}
      <label><span>New password</span><input type="password" name="password"
        autoComplete="new-password" minLength={8} maxLength={128} required />
        <small>Use at least 8 characters.</small></label>
      <label><span>Confirm new password</span><input type="password" name="confirmPassword"
        autoComplete="new-password" minLength={8} maxLength={128} required /></label>
      <button type="submit" disabled={busy}>{busy ? "Updating securely…" : "Update password"}</button>
      <button type="button" className="auth-text-button" disabled={busy}
        onClick={props.onCancel}>Cancel recovery</button>
    </form></section></main>;
}
