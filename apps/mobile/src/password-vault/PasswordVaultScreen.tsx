import { useMemo, useState } from "react";
import { VaultPassphraseForm } from "@diarydock/password-vault/passphrase-form";
import { VaultMfaGate } from "@diarydock/password-vault/mfa";
import { getMobileSupabase } from "@mobile/auth/supabase-client";
import type { VaultCredential } from "@diarydock/password-vault";
import { MobileBottomNav, type MobileDestination } from "@mobile/components/MobileBottomNav";
import { PasswordVaultEditor } from "./PasswordVaultEditor";
import { useMobilePasswordVault } from "./use-password-vault";
import "./password-vault.css";

export function PasswordVaultScreen(props: {
  accessToken: string;
  accountId: string;
  onBack: () => void;
  onNavigate: (destination: MobileDestination) => void;
}) {
  return (
    <VaultMfaGate client={getMobileSupabase()} accountId={props.accountId} onBack={props.onBack}>
      <AuthenticatedVault {...props} />
    </VaultMfaGate>
  );
}

function AuthenticatedVault(props: {
  accessToken: string;
  accountId: string;
  onBack: () => void;
  onNavigate: (destination: MobileDestination) => void;
}) {
  const vault = useMobilePasswordVault(props.accessToken, props.accountId);
  return (
    <PasswordVaultContent key={String(vault.unlocked) + vault.lockVersion} props={props} vault={vault} />
  );
}

function PasswordVaultContent({
  props,
  vault,
}: {
  props: {
    accessToken: string;
    accountId: string;
    onBack: () => void;
    onNavigate: (destination: MobileDestination) => void;
  };
  vault: ReturnType<typeof useMobilePasswordVault>;
}) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<VaultCredential | null | undefined>(),
    [shown, setShown] = useState<Set<string>>(new Set());
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return query
      ? vault.credentials.filter((entry) =>
          `${entry.name} ${entry.username} ${entry.website}`.toLocaleLowerCase().includes(query),
        )
      : vault.credentials;
  }, [search, vault.credentials]);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      window.setTimeout(async () => {
        try {
          if ((await navigator.clipboard.readText()) === value) await navigator.clipboard.writeText("");
        } catch {
          /* permission can expire */
        }
      }, 30_000);
    } catch {
      window.alert("Your phone did not allow DiaryDock to copy that value.");
    }
  }

  return (
    <main className="password-vault-screen">
      <header className="password-vault-hero">
        <button type="button" onClick={props.onBack} aria-label="Back">
          ‹
        </button>
        <div>
          <small>Private by design</small>
          <h1>Password Vault</h1>
          <p>Encrypted on this phone before syncing.</p>
        </div>
        {vault.unlocked ? (
          <button type="button" className="password-vault-lock" onClick={vault.lock}>
            Lock
          </button>
        ) : null}
      </header>
      <section className="password-vault-content">
        {vault.loading ? (
          <p className="password-vault-loading">Loading secure vault…</p>
        ) : !vault.snapshot ? (
          <p className="password-vault-error">Password Vault could not be loaded.</p>
        ) : !vault.unlocked ? (
          <div className="password-vault-gate">
            <div className="password-vault-lock-mark" aria-hidden="true">
              ⌾
            </div>
            <h2>{vault.snapshot.setup ? "Unlock your vault" : "Create your vault"}</h2>
            <p>
              {vault.snapshot.setup
                ? "Enter your separate vault passphrase. DiaryDock never receives it."
                : "Choose a separate passphrase you can remember. It cannot be recovered by DiaryDock."}
            </p>
            <VaultPassphraseForm exists={Boolean(vault.snapshot.setup)} busy={vault.busy}
              onUnlock={vault.open} onCreate={vault.create} />
          </div>
        ) : (
          <>
            <div className="password-vault-tools">
              <input
                aria-label="Search vault"
                placeholder="Search accounts"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <button type="button" onClick={() => setEditing(null)}>
                Add
              </button>
            </div>
            {!filtered.length ? (
              <div className="password-vault-empty">
                <h2>{vault.credentials.length ? "No matches" : "Your vault is ready"}</h2>
                <p>
                  {vault.credentials.length
                    ? "Try another search."
                    : "Add your first login. Every field is encrypted."}
                </p>
              </div>
            ) : (
              <div className="password-vault-list">
                {filtered.map((entry) => {
                  const reveal = shown.has(entry.id);
                  return (
                    <article key={entry.id}>
                      <header>
                        <h2>{entry.name}</h2>
                        <button type="button" onClick={() => setEditing(entry)}>
                          Edit
                        </button>
                      </header>
                      {entry.username ? (
                        <div>
                          <small>Username</small>
                          <p>
                            <span>{entry.username}</span>
                            <button type="button" onClick={() => void copy(entry.username)}>
                              Copy
                            </button>
                          </p>
                        </div>
                      ) : null}
                      <div>
                        <small>Password</small>
                        <p>
                          <span className="password-vault-secret">
                            {entry.password ? (reveal ? entry.password : "••••••••••••") : "—"}
                          </span>
                          {entry.password ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setShown((current) => {
                                    const next = new Set(current);
                                    if (reveal) next.delete(entry.id);
                                    else next.add(entry.id);
                                    return next;
                                  })
                                }
                              >
                                {reveal ? "Hide" : "Show"}
                              </button>
                              <button type="button" onClick={() => void copy(entry.password)}>
                                Copy
                              </button>
                            </>
                          ) : null}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="password-vault-delete"
                        disabled={vault.busy}
                        onClick={() => {
                          if (window.confirm(`Delete ${entry.name}?`))
                            void vault.remove(entry.id).catch(() => undefined);
                        }}
                      >
                        Delete
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
        {vault.error ? (
          <div className="password-vault-toast" role="alert">
            <span>{vault.error}</span>
            <button type="button" onClick={vault.clearError}>
              Close
            </button>
          </div>
        ) : null}
      </section>
      {vault.unlocked && editing !== undefined ? (
        <PasswordVaultEditor
          key={editing?.id ?? "new"}
          value={editing}
          busy={vault.busy}
          onClose={() => setEditing(undefined)}
          onSave={vault.save}
        />
      ) : null}
      <MobileBottomNav active={null} onNavigate={props.onNavigate} />
    </main>
  );
}
