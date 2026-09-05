import { useState, type FormEvent } from "react";

import { BrandMark } from "@mobile/components/BrandMark";
import type { PasswordResetRequest } from "./auth-types";

export function ForgotPasswordScreen(props: { error: string | null; onBack: () => void;
  onRequest: PasswordResetRequest }) {
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!email || email.length > 254) {
      setLocalError("Enter a valid email address.");
      return;
    }
    setLocalError(null);
    setBusy(true);
    try {
      const result = await props.onRequest(email);
      if (result.ok) setSentTo(email);
    } finally {
      setBusy(false);
    }
  }

  return <main className="mobile-shell"><section className="auth-card"
    aria-labelledby="forgot-password-title"><header className="auth-card-header">
      <BrandMark /><p className="eyebrow">Account recovery</p>
      <h1 id="forgot-password-title">{sentTo ? "Check your email" : "Reset your password"}</h1>
      <p>{sentTo ? `If an account exists for ${sentTo}, a secure reset link is on its way.`
        : "We’ll send a secure, single-use link back to this app."}</p>
    </header>{sentTo ? <div className="auth-confirmation">
      <p>Open the link on this device to choose a new password in DiaryDock.</p>
      <button type="button" onClick={props.onBack}>Back to sign in</button>
    </div> : <form className="auth-form" onSubmit={submit}>
      {localError || props.error ? <p className="form-message form-error" role="alert">
        {localError ?? props.error}</p> : null}
      <label><span>Email</span><input type="email" name="email" autoComplete="email"
        inputMode="email" maxLength={254} required /></label>
      <button type="submit" disabled={busy}>{busy ? "Sending securely…" : "Send reset link"}</button>
      <button type="button" className="auth-text-button" onClick={props.onBack}>Back to sign in</button>
    </form>}</section></main>;
}
