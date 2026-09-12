"use client";

import { useMemo, useState } from "react";
import type { VaultCredential } from "@diarydock/password-vault";
import { PasswordVaultEditor } from "./PasswordVaultEditor";
import { PasswordVaultGate } from "./PasswordVaultGate";
import { PasswordVaultList } from "./PasswordVaultList";
import { usePasswordVault } from "./usePasswordVault";

export function PasswordVaultWorkspace({ accountId }: { accountId: string }) {
  const vault = usePasswordVault(accountId);
  return <PasswordVaultContent key={String(vault.unlocked) + vault.lockVersion} vault={vault} />;
}

function PasswordVaultContent({ vault }: { vault: ReturnType<typeof usePasswordVault> }) {
  const [search, setSearch] = useState(""),
    [editing, setEditing] = useState<VaultCredential | null | undefined>();
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return query
      ? vault.credentials.filter((item) =>
          `${item.name} ${item.username} ${item.website}`.toLocaleLowerCase().includes(query),
        )
      : vault.credentials;
  }, [search, vault.credentials]);
  return (
    <main className="desktop-workspace min-h-screen bg-[#f2f5ed] px-4 pb-28 pt-6 lg:pb-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4 py-4 sm:py-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#6a806e]">Private by design</p>
            <h1 className="mt-2 font-serif text-4xl text-[#20352a] sm:text-5xl">Password Vault</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#617067]">
              Passwords are encrypted on this device with your vault passphrase. The stored copy contains
              ciphertext only.
            </p>
          </div>
          {vault.unlocked ? (
            <button
              onClick={vault.lock}
              className="min-h-11 rounded-2xl border border-[#315443]/15 bg-white px-5 font-bold text-[#315443]"
            >
              Lock vault
            </button>
          ) : null}
        </header>
        {vault.loading ? (
          <div className="rounded-[28px] bg-white/70 p-10 text-center text-[#5f6d64]">
            Loading secure vault…
          </div>
        ) : !vault.snapshot ? (
          <div className="rounded-2xl bg-white p-6 text-[#9b4037]" role="alert">
            Password Vault could not be loaded.
          </div>
        ) : !vault.unlocked ? (
          <PasswordVaultGate
            exists={Boolean(vault.snapshot.setup)}
            busy={vault.busy}
            onUnlock={vault.open}
            onCreate={vault.create}
          />
        ) : (
          <>
            <div className="mb-5 flex flex-wrap gap-3 rounded-[22px] border border-[#284735]/10 bg-white/70 p-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search accounts"
                aria-label="Search vault accounts"
                className="min-h-11 min-w-56 flex-1 rounded-xl border border-[#284735]/15 bg-white px-4 outline-none focus:border-[#47745b]"
              />
              <button
                onClick={() => setEditing(null)}
                className="min-h-11 rounded-xl bg-[#274c39] px-5 font-bold text-white"
              >
                Add account
              </button>
            </div>
            <PasswordVaultList
              credentials={filtered}
              busy={vault.busy}
              onEdit={setEditing}
              onDelete={async (entry) => {
                try {
                  await vault.remove(entry.id);
                } catch {
                  /* displayed by session */
                }
              }}
            />
          </>
        )}
        {vault.error ? (
          <div
            className="fixed bottom-24 left-1/2 z-[120] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-2xl bg-[#923f36] px-5 py-4 text-sm font-semibold text-white shadow-xl"
            role="alert"
          >
            <div className="flex items-center justify-between gap-3">
              <span>{vault.error}</span>
              <button onClick={vault.clearError} className="rounded-lg px-2 py-1">
                Close
              </button>
            </div>
          </div>
        ) : null}
      </div>
      {vault.unlocked && editing !== undefined ? (
        <PasswordVaultEditor
          key={editing?.id ?? "new"}
          value={editing}
          busy={vault.busy}
          onClose={() => setEditing(undefined)}
          onSave={vault.save}
        />
      ) : null}
    </main>
  );
}
