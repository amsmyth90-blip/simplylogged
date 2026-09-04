import { useCallback, useEffect, useRef, useState } from "react";

import type { JsonObject } from "@diarydock/contracts";
import { type OfflineStore, tryGetReadModel, tryPutReadModel,
  tryRemoveReadModel } from "@diarydock/offline-store";
import { TRAVEL_SCHEMA_VERSION, parseTravelSnapshot, type TravelSnapshot } from "@diarydock/travel";

import { loadMobileTravel, mutateMobileTravel, TravelConflictError,
  type TravelDraftMutation } from "./travel-client";

const CACHE_KEY = "travel";

async function cacheSnapshot(store: OfflineStore, snapshot: TravelSnapshot) {
  await tryPutReadModel(store, CACHE_KEY, TRAVEL_SCHEMA_VERSION,
    snapshot as unknown as JsonObject);
}

async function cachedSnapshot(store: OfflineStore) {
  const cached = await tryGetReadModel(store, CACHE_KEY);
  if (!cached) return null;
  if (cached.schemaVersion !== TRAVEL_SCHEMA_VERSION) {
    await tryRemoveReadModel(store, CACHE_KEY);
    return null;
  }
  try {
    return parseTravelSnapshot(cached.payload);
  } catch {
    await tryRemoveReadModel(store, CACHE_KEY);
    return null;
  }
}

export function useTravel(input: {
  accessToken: string;
  disableOnline?: boolean;
  initialSnapshot?: TravelSnapshot;
  store: OfflineStore;
  syncStatus: string;
}) {
  const [snapshot, setSnapshot] = useState<TravelSnapshot | null>(input.initialSnapshot ?? null);
  const [online, setOnline] = useState(() => input.disableOnline ? false : navigator.onLine);
  const [loading, setLoading] = useState(!input.initialSnapshot);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const requestVersion = useRef(0);

  useEffect(() => {
    if (input.disableOnline) return undefined;
    const connected = () => setOnline(true);
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
    if (input.disableOnline) { setLoading(false); return; }
    setLoading(true);
    const cached = await cachedSnapshot(input.store);
    if (version !== requestVersion.current) return;
    if (cached) setSnapshot(cached);
    if (!online) {
      setMessage(cached ? "Encrypted offline copy — connect to update trips."
        : "Connect once to save the Driveway on this device.");
      setLoading(false);
      return;
    }
    try {
      const remote = await loadMobileTravel(input.accessToken);
      if (version !== requestVersion.current) return;
      await cacheSnapshot(input.store, remote);
      setSnapshot(remote);
      setMessage(null);
    } catch (reason) {
      if (version !== requestVersion.current) return;
      setMessage(cached ? "Could not refresh. Showing the encrypted Driveway copy."
        : reason instanceof Error ? reason.message : "The Driveway could not be loaded.");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [input.accessToken, input.disableOnline, input.store, online]);

  useEffect(() => {
    void refresh();
    return () => { requestVersion.current += 1; };
  }, [refresh, input.syncStatus]);

  const mutate = useCallback(async (mutation: TravelDraftMutation) => {
    if (!online || !snapshot) {
      setMessage("Connect to change the Driveway.");
      return false;
    }
    setBusy(true);
    setMessage(null);
    try {
      const next = await mutateMobileTravel(input.accessToken, mutation, snapshot.revision);
      await cacheSnapshot(input.store, next);
      setSnapshot(next);
      setMessage("Driveway saved securely.");
      return true;
    } catch (reason) {
      if (reason instanceof TravelConflictError) {
        await cacheSnapshot(input.store, reason.snapshot);
        setSnapshot(reason.snapshot);
      }
      setMessage(reason instanceof Error ? reason.message : "The Driveway could not be saved.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [input.accessToken, input.store, online, snapshot]);

  return { busy, loading, message, mutate, online, refresh, snapshot };
}
