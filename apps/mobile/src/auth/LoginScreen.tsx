import { useState, type FormEvent } from "react";

import { BrandMark } from "@mobile/components/BrandMark";

type LoginScreenProps = {
  error: string | null;
  message: string | null;
  onCreateAccount: () => void;
  onForgotPassword: () => void;
  onSignIn: (email: string, password: string) => Promise<{ ok: boolean }>;
};

export function LoginScreen({ error, message, onCreateAccount, onForgotPassword, onSignIn }: LoginScreenProps) {
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await onSignIn(String(form.get("email") ?? ""), String(form.get("password") ?? ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mobile-shell">
      <section className="auth-card" aria-labelledby="login-title">
        <header className="auth-card-header">
          <BrandMark />
          <p className="eyebrow">DiaryDock</p>
          <h1 id="login-title">Welcome back</h1>
          <p>Sign in to your digital home for everyday life.</p>
        </header>
        <form className="auth-form" onSubmit={submit}>
          {error ? <p className="form-message form-error" role="alert">{error}</p> : null}
          {message ? <p className="form-message form-success" role="status">{message}</p> : null}
          <label>
            <span>Email</span>
            <input type="email" name="email" autoComplete="email" required />
          </label>
          <label>
            <span>Password</span>
            <input type="password" name="password" autoComplete="current-password" required />
          </label>
          <button type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <button type="button" className="auth-text-button"
            onClick={onForgotPassword}>Forgot password?</button>
        </form>
        <footer className="auth-card-footer">
          <strong>New to DiaryDock?</strong>
          <p>Create your account and complete the same private setup used by the web app.</p>
          <button type="button" onClick={onCreateAccount}>Create account</button>
          <small>Create your account and complete private setup without leaving the app.</small>
        </footer>
      </section>
    </main>
  );
}
