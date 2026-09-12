import { useEffect, useMemo } from "react";
import { App } from "@capacitor/app";
import { useVaultSession } from "@diarydock/password-vault/react";
import {
  loadMobilePasswordVault,
  removeMobilePasswordVaultEntry,
  saveMobilePasswordVaultEntry,
  setupMobilePasswordVault,
} from "./password-vault-client";

export function useMobilePasswordVault(accessToken: string, accountId: string) {
  const transport = useMemo(
    () => ({
      load: () => loadMobilePasswordVault(accessToken),
      setup: (value: Parameters<typeof setupMobilePasswordVault>[1]) =>
        setupMobilePasswordVault(accessToken, value),
      save: (value: Parameters<typeof saveMobilePasswordVaultEntry>[1], expected: number) =>
        saveMobilePasswordVaultEntry(accessToken, value, expected),
      remove: (id: string, expected: number) => removeMobilePasswordVaultEntry(accessToken, id, expected),
    }),
    [accessToken],
  );
  const vault = useVaultSession(accountId, transport);
  const lock = vault.lock;
  useEffect(() => {
    const listener = App.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) lock();
    });
    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, [lock]);
  return vault;
}
