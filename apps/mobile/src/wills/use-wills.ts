import { useCallback, useEffect, useRef, useState } from "react";

import { WILLS_SCHEMA_VERSION, parseWillsSnapshot, type WillsSnapshot } from "@diarydock/wills";
import type { JsonObject } from "@diarydock/contracts";
import { type OfflineStore, tryGetReadModel, tryPutReadModel,
  tryRemoveReadModel } from "@diarydock/offline-store";

import { loadMobileWills, mutateMobileWills, WillsConflictError, type WillsDraftMutation } from "./wills-client";

const CACHE_KEY = "safe-room-wills";

async function cache(store: OfflineStore, snapshot: WillsSnapshot) {
  await tryPutReadModel(store, CACHE_KEY, WILLS_SCHEMA_VERSION,
    snapshot as unknown as JsonObject);
}

async function cached(store: OfflineStore) {
  const value = await tryGetReadModel(store, CACHE_KEY);
  if (!value) return null;
  if (value.schemaVersion !== WILLS_SCHEMA_VERSION) {
    await tryRemoveReadModel(store, CACHE_KEY);
    return null;
  }
  try {
    return parseWillsSnapshot(value.payload);
  } catch {
    await tryRemoveReadModel(store, CACHE_KEY);
    return null;
  }
}

export function useWills(input: {
  accessToken: string;
  disableOnline?: boolean;
  initialSnapshot?: WillsSnapshot;
  store: OfflineStore;
  syncStatus: string;
}) {
  const [snapshot, setSnapshot] = useState<WillsSnapshot | null>(input.initialSnapshot ?? null);
  const [online, setOnline] = useState(() => !input.disableOnline && navigator.onLine);
  const [loading, setLoading] = useState(!input.initialSnapshot);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const requestVersion = useRef(0);

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
    const version = ++requestVersion.current;
    setLoading(true);
    const local = input.initialSnapshot ?? await cached(input.store);
    if (version !== requestVersion.current) return;
    if (local) setSnapshot(local);
    if (input.disableOnline || !online) {
      setMessage(input.disableOnline ? null : local
        ? "Encrypted offline copy — connect to refresh the Safe Room."
        : "Connect once to save the Safe Room on this device.");
      setLoading(false);
      return;
    }
    try {
      const remote = await loadMobileWills(input.accessToken);
      if (version !== requestVersion.current) return;
      await cache(input.store, remote);
      setSnapshot(remote);
      setMessage(null);
    } catch (reason) {
      if (version !== requestVersion.current) return;
      setMessage(local ? "Could not refresh. Showing the encrypted Safe Room copy on this device."
        : reason instanceof Error ? reason.message : "The Safe Room could not be loaded.");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [input.accessToken, input.disableOnline, input.initialSnapshot, input.store, online]);

  useEffect(() => {
    void refresh();
    return () => { requestVersion.current += 1; };
  }, [refresh, input.syncStatus]);

  const mutate = useCallback(async (mutation: WillsDraftMutation) => {
    if (!online || input.disableOnline || !snapshot) {
      setMessage("Connect to change legal-planning records.");
      return false;
    }
    setBusy(true);
    setMessage(null);
    try {
      const next = await mutateMobileWills(input.accessToken, mutation, snapshot.revision);
      await cache(input.store, next);
      setSnapshot(next);
      setMessage("Safe Room record saved securely.");
      return true;
    } catch (reason) {
      if (reason instanceof WillsConflictError) {
        await cache(input.store, reason.snapshot);
        setSnapshot(reason.snapshot);
      }
      setMessage(reason instanceof Error ? reason.message : "The Safe Room update could not be saved.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [input.accessToken, input.disableOnline, input.store, online, snapshot]);

  return { busy, loading, message, mutate, online, refresh, snapshot };
}
