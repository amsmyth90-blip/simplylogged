"use client";
import { useMemo } from "react";
import { useVaultSession } from "@diarydock/password-vault/react";
import { webVaultTransport } from "./password-vault-client";

export function usePasswordVault(accountId: string) {
  const transport = useMemo(() => webVaultTransport(accountId), [accountId]);
  return useVaultSession(accountId, transport);
}
