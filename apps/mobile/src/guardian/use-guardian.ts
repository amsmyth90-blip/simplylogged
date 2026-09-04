import { useCallback, useEffect, useRef, useState } from "react";

import type {
  GuardianDecision,
  GuardianFinding,
} from "@diarydock/guardian";
import type { OfflineStore } from "@diarydock/offline-store";

import { decideMobileGuardian, loadMobileGuardian } from "./guardian-client";
import { loadLocalGuardian } from "./local-guardian";

export function useGuardian(input: {
  accessToken: string;
  disableOnline?: boolean;
  store: OfflineStore;
  syncStatus: string;
}) {
  const [local, setLocal] = useState<GuardianFinding[]>([]);
  const [remote, setRemote] = useState<GuardianFinding[] | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  useEffect(() => {
    const connected = () => setOnline(true);
    const disconnected = () => setOnline(false);
    window.addEventListener("online", connected);
    window.addEventListener("offline", disconnected);
    return () => {
      window.removeEventListener("online", connected);
      window.removeEventListener("offline", disconnected);
    };
  }, []);

  const reload = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const findings = await loadLocalGuardian(input.store);
      if (version === requestVersion.current) setLocal(findings);
    } catch {
      if (version === requestVersion.current) setLocal([]);
    }
    if (version !== requestVersion.current) return;
    if (input.disableOnline || !online) {
      setRemote(null);
      setError(input.disableOnline ? null : "Offline briefing from this encrypted device");
      setLoading(false);
      return;
    }
    try {
      const response = await loadMobileGuardian(input.accessToken);
      if (version !== requestVersion.current) return;
      setRemote(response.findings);
      setError(null);
    } catch {
      if (version !== requestVersion.current) return;
      setRemote(null);
      setError("Guardian could not refresh. Showing this device’s offline briefing.");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [input.accessToken, input.disableOnline, input.store, online]);

  useEffect(() => {
    void reload();
    return () => { requestVersion.current += 1; };
  }, [reload, input.syncStatus]);

  const decide = useCallback(async (finding: GuardianFinding, decision: GuardianDecision) => {
    if (input.disableOnline || !online || finding.id.startsWith("local:")) {
      setError("Connect to update this Guardian item.");
      return false;
    }
    try {
      await decideMobileGuardian(input.accessToken, finding.id, decision);
      setRemote((current) => current?.filter((item) => item.id !== finding.id) ?? null);
      setError(decision === "snooze" ? "Hidden for seven days." : decision === "resolve" ? "Marked as sorted." : "Removed from this briefing.");
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That Guardian item could not be updated.");
      return false;
    }
  }, [input.accessToken, input.disableOnline, online]);

  return {
    decide,
    error,
    findings: remote ?? local,
    loading,
    online: !input.disableOnline && online && remote !== null,
  };
}
