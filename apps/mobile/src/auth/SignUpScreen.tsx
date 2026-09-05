import { useState, type FormEvent } from "react";

import { BrandMark } from "@mobile/components/BrandMark";
import type { SignUp } from "./auth-types";

type SignUpScreenProps = {
  error: string | null;
  onBack: () => void;
  onSignUp: SignUp;
};

function validate(email: string, password: string, confirmation: string) {
  if (!email || !password || !confirmation) return "Enter your email and password.";
  if (email.length > 254) return "Enter a valid email address.";
  if (password.length < 8) return "Use a password with at least 8 characters.";
  if (password.length > 128) return "Use a password with no more than 128 characters.";
  if (password !== confirmation) return "The passwords do not match.";
  return null;
}

export function SignUpScreen({ error, onBack, onSignUp }: SignUpScreenProps) {
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmPassword") ?? "");
    const validationError = validate(email, password, confirmation);
    setLocalError(validationError);
    if (validationError) return;

    setBusy(true);
    try {
      const result = await onSignUp(email, password);
      if (result.ok && result.requiresEmailConfirmation) setConfirmationEmail(email);
    } finally {
      setBusy(false);
    }
  }

  if (confirmationEmail) {
    return (
      <main className="mobile-shell">
        <section className="auth-card" aria-labelledby="signup-confirmation-title">
          <header className="auth-card-header">
            <BrandMark />
            <p className="eyebrow">One secure step</p>
            <h1 id="signup-confirmation-title">Check your email</h1>
            <p>We sent a confirmation link to {confirmationEmail}.</p>
          </header>
          <div className="auth-confirmation">
            {error ? <p className="form-message form-error" role="alert">{error}</p> : null}
            <p>Open the link on this device. DiaryDock will return here securely and continue with your private setup.</p>
            <button type="button" onClick={onBack}>Back to sign in</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mobile-shell">
      <section className="auth-card" aria-labelledby="signup-title">
        <header className="auth-card-header">
          <BrandMark />
          <p className="eyebrow">DiaryDock</p>
          <h1 id="signup-title">Create your account</h1>
          <p>Start setting up your private digital home for everyday life.</p>
        </header>
        <form className="auth-form" onSubmit={submit}>
          {localError || error ? <p className="form-message form-error" role="alert">
            {localError ?? error}</p> : null}
          <label>
            <span>Email</span>
            <input type="email" name="email" autoComplete="email" inputMode="email"
              maxLength={254} required />
          </label>
          <label>
            <span>Password</span>
            <input type="password" name="password" autoComplete="new-password"
              minLength={8} maxLength={128} required />
            <small>Use at least 8 characters.</small>
          </label>
          <label>
            <span>Confirm password</span>
            <input type="password" name="confirmPassword" autoComplete="new-password"
              minLength={8} maxLength={128} required />
          </label>
          <button type="submit" disabled={busy}>
            {busy ? "Creating account…" : "Create account"}
          </button>
          <button type="button" className="auth-text-button" onClick={onBack}>
            Already have an account? Sign in
          </button>
        </form>
      </section>
    </main>
  );
}
