import { useCallback, useEffect, useRef, useState } from "react";

import {
  HEALTH_SCHEMA_VERSION,
  parseHealthSnapshot,
  type HealthSnapshot,
} from "@diarydock/health";
import type { JsonObject } from "@diarydock/contracts";
import { type OfflineStore, tryGetReadModel, tryPutReadModel,
  tryRemoveReadModel } from "@diarydock/offline-store";

import {
  HealthConflictError,
  loadMobileHealth,
  mutateMobileHealth,
  type HealthDraftMutation,
} from "./health-client";

const CACHE_KEY = "health-records";

async function cacheSnapshot(store: OfflineStore, snapshot: HealthSnapshot) {
  await tryPutReadModel(store,
    CACHE_KEY,
    HEALTH_SCHEMA_VERSION,
    snapshot as unknown as JsonObject,
  );
}

async function cachedSnapshot(store: OfflineStore) {
  const cached = await tryGetReadModel(store, CACHE_KEY);
  if (!cached) return null;
  if (cached.schemaVersion !== HEALTH_SCHEMA_VERSION) {
    await tryRemoveReadModel(store, CACHE_KEY);
    return null;
  }
  try {
    return parseHealthSnapshot(cached.payload);
  } catch {
    await tryRemoveReadModel(store, CACHE_KEY);
    return null;
  }
}

export function useHealth(input: {
  accessToken: string;
  disableOnline?: boolean;
  initialSnapshot?: HealthSnapshot;
  store: OfflineStore;
  syncStatus: string;
}) {
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(
    input.initialSnapshot ?? null,
  );
  const [online, setOnline] = useState(
    () => !input.disableOnline && navigator.onLine,
  );
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
    const cached = input.initialSnapshot ?? (await cachedSnapshot(input.store));
    if (version !== requestVersion.current) return;
    if (cached) setSnapshot(cached);
    if (input.disableOnline || !online) {
      setMessage(
        input.disableOnline
          ? null
          : cached
            ? "Encrypted offline copy — connect to refresh My Health."
            : "Connect once to save My Health on this device.",
      );
      setLoading(false);
      return;
    }
    try {
      const remote = await loadMobileHealth(input.accessToken);
      if (version !== requestVersion.current) return;
      await cacheSnapshot(input.store, remote);
      setSnapshot(remote);
      setMessage(null);
    } catch (reason) {
      if (version !== requestVersion.current) return;
      setMessage(
        cached
          ? "Could not refresh. Showing the encrypted health copy saved on this device."
          : reason instanceof Error
            ? reason.message
            : "My Health could not be loaded.",
      );
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [input.accessToken, input.disableOnline, input.initialSnapshot, input.store, online]);

  useEffect(() => {
    void refresh();
    return () => {
      requestVersion.current += 1;
    };
  }, [refresh, input.syncStatus]);

  const mutate = useCallback(async (mutation: HealthDraftMutation) => {
    if (!online || input.disableOnline || !snapshot) {
      setMessage("Connect to change health records.");
      return false;
    }
    setBusy(true);
    setMessage(null);
    try {
      const next = await mutateMobileHealth(
        input.accessToken,
        mutation,
        snapshot.revision,
      );
      await cacheSnapshot(input.store, next);
      setSnapshot(next);
      setMessage("Health record saved securely.");
      return true;
    } catch (reason) {
      if (reason instanceof HealthConflictError) {
        await cacheSnapshot(input.store, reason.snapshot);
        setSnapshot(reason.snapshot);
      }
      setMessage(
        reason instanceof Error ? reason.message : "The health update could not be saved.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }, [input.accessToken, input.disableOnline, input.store, online, snapshot]);

  return { busy, loading, message, mutate, online, refresh, snapshot };
}
