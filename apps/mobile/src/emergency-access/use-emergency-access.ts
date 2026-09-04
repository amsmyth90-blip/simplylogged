import { useCallback, useEffect, useState } from "react";

import type {
  EmergencyAccessDirectory,
  EmergencyAccessMutation,
} from "@diarydock/emergency-access";

import {
  loadMobileEmergencyAccess,
  mutateMobileEmergencyAccess,
} from "./emergency-access-client";

export function useEmergencyAccess(input: {
  accessToken: string;
  initialDirectory?: EmergencyAccessDirectory;
  disableOnline?: boolean;
}) {
  const [directory, setDirectory] = useState<EmergencyAccessDirectory | null>(input.initialDirectory ?? null);
  const [online, setOnline] = useState(() => !input.disableOnline && navigator.onLine);
  const [loading, setLoading] = useState(!input.initialDirectory);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitePath, setInvitePath] = useState<string | null>(null);

  useEffect(() => {
    const connected = () => setOnline(!input.disableOnline);
    const disconnected = () => setOnline(false);
    window.addEventListener("online", connected);
    window.addEventListener("offline", disconnected);
    return () => {
      window.removeEventListener("online", connected);
      window.removeEventListener("offline", disconnected);
    };
  }, [input.disableOnline]);

  const refresh = useCallback(async () => {
    if (input.disableOnline || !online) {
      setError("Connect to view or change trusted access.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await loadMobileEmergencyAccess(input.accessToken);
      setDirectory(result.directory);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Trusted access could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [input.accessToken, input.disableOnline, online]);

  useEffect(() => {
    if (!input.initialDirectory) void refresh();
  }, [input.initialDirectory, refresh]);

  const mutate = useCallback(async (mutation: EmergencyAccessMutation) => {
    if (!online || input.disableOnline) {
      setError("Connect to change trusted access.");
      return false;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await mutateMobileEmergencyAccess(input.accessToken, mutation);
      setDirectory(result.directory);
      setInvitePath(result.invitePath ?? null);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Trusted access could not be changed.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [input.accessToken, input.disableOnline, online]);

  return { busy, directory, error, invitePath, loading, mutate, online, refresh, setInvitePath };
}
