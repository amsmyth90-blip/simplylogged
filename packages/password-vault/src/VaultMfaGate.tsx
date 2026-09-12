"use client";
import { useState, type ReactNode, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useVaultMfa } from "./use-vault-mfa.ts";
import "./vault-mfa.css";

type GateProps = {
  client: SupabaseClient;
  accountId: string;
  children: ReactNode;
  onBack?: () => void;
};
export function VaultMfaGate(props: GateProps) {
  return <VaultMfaContent key={props.accountId} {...props} />;
}
function VaultMfaContent(props: GateProps) {
  const mfa = useVaultMfa(props.client, props.accountId);
  const [code, setCode] = useState("");
  const [selected, setSelected] = useState("");
  if (mfa.status === "ready") return props.children;
  const factorId =
    mfa.setup?.id ?? (mfa.factors.some((f) => f.id === selected) ? selected : mfa.factors[0]?.id);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const entered = code;
    setCode("");
    if (factorId) await mfa.verify(factorId, entered);
  }
  return (
    <section className="vault-mfa" aria-label="Password Vault two-factor authentication">
      {props.onBack && (
        <button type="button" className="vault-mfa-back" onClick={props.onBack}>
          Back
        </button>
      )}
      <p className="vault-mfa-eyebrow">Password Vault</p>
      <h1>Two-factor protection</h1>
      {mfa.status === "loading" ? (
        <p role="status">Checking your secure session…</p>
      ) : (
        <>
          <p>
            Protect your vault with a code from your authenticator app, followed by your separate vault
            passphrase.
          </p>
          {mfa.status === "required" && (
            <>
              {!factorId ? (
                <button type="button" disabled={mfa.busy} onClick={() => void mfa.enroll()}>
                  Set up authenticator
                </button>
              ) : (
                <form onSubmit={submit}>
                  {mfa.setup && (
                    <div className="vault-mfa-setup">
                      <p>
                        Scan this QR code with your authenticator app. On the same phone, enter the setup key
                        manually.
                      </p>
                      {/* Supabase supplies an SVG data URL; it is rendered as an image, never injected as HTML. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={mfa.setup.qr.startsWith("data:image/svg+xml") ? mfa.setup.qr : undefined}
                        alt="Authenticator setup QR code"
                        width="200"
                        height="200"
                      />
                      <details>
                        <summary>Show setup key</summary>
                        <code>{mfa.setup.secret}</code>
                      </details>
                      <p>
                        Keep access to your authenticator. DiaryDock cannot recover your vault passphrase.
                      </p>
                    </div>
                  )}
                  {!mfa.setup && mfa.factors.length > 1 && (
                    <label>
                      Authenticator
                      <select value={factorId} onChange={(e) => setSelected(e.target.value)}>
                        {mfa.factors.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.friendly_name || "Authenticator"}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label>
                    Six-digit authentication code
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                      aria-label="Six-digit authentication code"
                    />
                  </label>
                  <button disabled={mfa.busy || code.length !== 6} type="submit">
                    {mfa.busy ? "Verifying…" : "Verify and continue"}
                  </button>
                </form>
              )}
            </>
          )}
          {mfa.error && (
            <p role="alert" className="vault-mfa-error">
              {mfa.error}
            </p>
          )}
          {mfa.status === "error" && (
            <button type="button" onClick={() => void mfa.refresh()}>
              Try again
            </button>
          )}
        </>
      )}
    </section>
  );
}
