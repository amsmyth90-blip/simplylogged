import { useCallback, useEffect, useRef, useState } from "react";

import type { JsonObject } from "@diarydock/contracts";
import {
  KITCHEN_SCHEMA_VERSION,
  parseKitchenSnapshot,
  type KitchenSnapshot,
} from "@diarydock/kitchen";
import { type OfflineStore, tryGetReadModel, tryPutReadModel,
  tryRemoveReadModel } from "@diarydock/offline-store";

import {
  KitchenConflictError,
  loadMobileKitchen,
  mutateMobileKitchen,
  type KitchenDraftMutation,
} from "./kitchen-client";

const CACHE_KEY = "kitchen-pantry";

async function cacheSnapshot(store: OfflineStore, snapshot: KitchenSnapshot) {
  await tryPutReadModel(store, CACHE_KEY, KITCHEN_SCHEMA_VERSION,
    snapshot as unknown as JsonObject);
}

async function cachedSnapshot(store: OfflineStore) {
  const cached = await tryGetReadModel(store, CACHE_KEY);
  if (!cached) return null;
  if (cached.schemaVersion !== KITCHEN_SCHEMA_VERSION) {
    await tryRemoveReadModel(store, CACHE_KEY);
    return null;
  }
  try {
    return parseKitchenSnapshot(cached.payload);
  } catch {
    await tryRemoveReadModel(store, CACHE_KEY);
    return null;
  }
}

export function useKitchen(input: {
  accessToken: string;
  disableOnline?: boolean;
  initialSnapshot?: KitchenSnapshot;
  store: OfflineStore;
  syncStatus: string;
}) {
  const [snapshot, setSnapshot] = useState<KitchenSnapshot | null>(input.initialSnapshot ?? null);
  const [online, setOnline] = useState(() => !input.disableOnline && navigator.onLine);
  const [loading, setLoading] = useState(!input.initialSnapshot);
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<"CACHE" | "NETWORK">("CACHE");
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
    const cached = input.initialSnapshot ?? await cachedSnapshot(input.store);
    if (version !== requestVersion.current) return;
    if (cached) { setSnapshot(cached); setSource("CACHE"); }
    if (input.disableOnline || !online) {
      setMessage(input.disableOnline ? null : cached
        ? "Encrypted offline copy — connect to change the lists."
        : "Connect once to save the Kitchen on this device.");
      setLoading(false);
      return;
    }
    try {
      const remote = await loadMobileKitchen(input.accessToken);
      if (version !== requestVersion.current) return;
      await cacheSnapshot(input.store, remote);
      setSnapshot(remote);
      setSource("NETWORK");
      setMessage(null);
    } catch (reason) {
      if (version !== requestVersion.current) return;
      setMessage(cached
        ? "Could not refresh. Showing the encrypted copy saved on this device."
        : reason instanceof Error ? reason.message : "The Kitchen could not be loaded.");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [input.accessToken, input.disableOnline, input.initialSnapshot, input.store, online]);

  useEffect(() => {
    void refresh();
    return () => { requestVersion.current += 1; };
  }, [refresh, input.syncStatus]);

  const mutate = useCallback(async (mutation: KitchenDraftMutation) => {
    if (!online || input.disableOnline || !snapshot) {
      setMessage("Connect to change the Kitchen lists.");
      return false;
    }
    setBusy(true);
    setMessage(null);
    try {
      const next = await mutateMobileKitchen(input.accessToken, mutation, snapshot.revision);
      await cacheSnapshot(input.store, next);
      setSnapshot(next);
      setSource("NETWORK");
      setMessage("Kitchen updated securely.");
      return true;
    } catch (reason) {
      if (reason instanceof KitchenConflictError) {
        await cacheSnapshot(input.store, reason.snapshot);
        setSnapshot(reason.snapshot);
        setSource("NETWORK");
      }
      setMessage(reason instanceof Error ? reason.message : "The Kitchen could not be updated.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [input.accessToken, input.disableOnline, input.store, online, snapshot]);

  return { busy, loading, message, mutate, online, refresh, snapshot, source };
}
