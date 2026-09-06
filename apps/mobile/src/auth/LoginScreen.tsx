import { useState, type CSSProperties, type FormEvent } from "react";

import doorImage from "../../../../public/images/auth/diarydock-door-login.webp";
import "./login.css";

type LoginScreenProps = {
  error: string | null;
  message: string | null;
  onCreateAccount: () => void;
  onForgotPassword: () => void;
  onSignIn: (email: string, password: string) => Promise<{ ok: boolean }>;
};

function EmailIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.5h17v11h-17z" />
    <path d="m4.5 7.5 7.5 6 7.5-6" /></svg>;
}

function LockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg>;
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z" />
    <circle cx="12" cy="12" r="2.5" />{hidden ? <path d="m4 4 16 16" /> : null}</svg>;
}

export function LoginScreen({ error, message, onCreateAccount, onForgotPassword, onSignIn }: LoginScreenProps) {
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const background = { "--login-door-image": `url(${doorImage})` } as CSSProperties;

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
    <main className="login-shell" style={background}>
      <section className="login-panel" aria-labelledby="login-title">
        <header className="login-header">
          <p className="login-wordmark">DiaryDock</p>
          <h1 id="login-title">Welcome back</h1>
          <span className="login-ornament" aria-hidden="true" />
        </header>
        <form className="login-form" onSubmit={submit}>
          {error ? <p className="form-message form-error" role="alert">{error}</p> : null}
          {message ? <p className="form-message form-success" role="status">{message}</p> : null}
          <label className="login-field">
            <span className="login-sr-only">Email</span>
            <span className="login-field-icon"><EmailIcon /></span>
            <input type="email" name="email" placeholder="Email" autoCapitalize="none"
              autoCorrect="off" inputMode="email" autoComplete="email" required />
          </label>
          <label className="login-field">
            <span className="login-sr-only">Password</span>
            <span className="login-field-icon"><LockIcon /></span>
            <input type={showPassword ? "text" : "password"} name="password"
              placeholder="Password" autoComplete="current-password" required />
            <button type="button" className="login-password-toggle"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>
              <EyeIcon hidden={showPassword} />
            </button>
          </label>
          <button type="submit" className="login-submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <button type="button" className="login-forgot" onClick={onForgotPassword}>
            <span>Forgot password?</span>
          </button>
        </form>
        <footer className="login-footer">
          <span>New to DiaryDock?</span>
          <button type="button" onClick={onCreateAccount}>Create account</button>
        </footer>
      </section>
    </main>
  );
}
