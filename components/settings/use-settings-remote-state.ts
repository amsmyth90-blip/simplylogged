import { useEffect, useState } from "react";

import type { ForwardingAddressState, StorageSummary } from "@/components/settings/settings-model";
import type { RepositoryMode } from "@/lib/diarydock-data";

export function useSettingsRemoteState(repositoryMode: RepositoryMode) {
  const [forwardingAddress, setForwardingAddress] = useState<ForwardingAddressState>({ status: "loading" });
  const [storageSummary, setStorageSummary] = useState<StorageSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadForwardingAddress() {
      try {
        const response = await fetch("/api/import/email-address", { cache: "no-store" });
        const payload = await response.json().catch(() => null) as { configured?: boolean; address?: string; message?: string; error?: string } | null;
        if (cancelled) return;
        if (!response.ok) {
          setForwardingAddress({ status: "error", message: payload?.error ?? "Email forwarding is not available yet." });
        } else if (payload?.configured && payload.address) {
          setForwardingAddress({ status: "ready", address: payload.address, copied: false });
        } else {
          setForwardingAddress({ status: "not-configured", message: payload?.message ?? "Email forwarding needs the production mail provider connected." });
        }
      } catch {
        if (!cancelled) setForwardingAddress({ status: "error", message: "Unable to check the forwarding address right now." });
      }
    }
    void loadForwardingAddress();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (repositoryMode !== "supabase") return;
    let cancelled = false;
    void fetch("/api/storage/summary", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<StorageSummary> : null)
      .then((summary) => { if (!cancelled && summary) setStorageSummary(summary); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [repositoryMode]);

  const copyForwardingAddress = async () => {
    if (forwardingAddress.status !== "ready") return;
    await navigator.clipboard.writeText(forwardingAddress.address);
    setForwardingAddress({ ...forwardingAddress, copied: true });
  };

  return { copyForwardingAddress, forwardingAddress, storageSummary };
}
