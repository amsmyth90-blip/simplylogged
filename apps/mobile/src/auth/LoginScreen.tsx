import { useState, type FormEvent } from "react";

import { BrandMark } from "@mobile/components/BrandMark";
import { openMobileAuthPage, type MobileAuthPage } from "./auth-browser";

type LoginScreenProps = {
  error: string | null;
  onSignIn: (email: string, password: string) => Promise<{ ok: boolean }>;
};

export function LoginScreen({ error, onSignIn }: LoginScreenProps) {
  const [busy, setBusy] = useState(false);
  const [navigationError, setNavigationError] = useState<string | null>(null);

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

  async function open(page: MobileAuthPage) {
    setNavigationError(null);
    try { await openMobileAuthPage(page); }
    catch { setNavigationError("The secure DiaryDock account page could not be opened."); }
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
          {error || navigationError ? <p className="form-message form-error" role="alert">
            {error ?? navigationError}</p> : null}
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
            onClick={() => void open("/forgot-password")}>Forgot password?</button>
        </form>
        <footer className="auth-card-footer">
          <strong>New to DiaryDock?</strong>
          <p>Create your account and complete the same private setup used by the web app.</p>
          <button type="button" onClick={() => void open("/signup")}>Create account</button>
          <small>Account setup opens in a secure DiaryDock window. Return here to sign in.</small>
        </footer>
      </section>
    </main>
  );
}
