import { useCallback, useEffect, useRef, useState } from "react";

import type { JsonObject } from "@diarydock/contracts";
import {
  GARAGE_SCHEMA_VERSION,
  parseGarageSnapshot,
  type GarageSnapshot,
} from "@diarydock/vehicles";
import { type OfflineStore, tryGetReadModel, tryPutReadModel,
  tryRemoveReadModel } from "@diarydock/offline-store";

import {
  GarageConflictError,
  loadMobileGarage,
  mutateMobileGarage,
  type GarageDraftMutation,
} from "./garage-client";

const CACHE_KEY = "garage-records";

async function cacheSnapshot(store: OfflineStore, snapshot: GarageSnapshot) {
  await tryPutReadModel(store,
    CACHE_KEY,
    GARAGE_SCHEMA_VERSION,
    snapshot as unknown as JsonObject,
  );
}

async function cachedSnapshot(store: OfflineStore) {
  const cached = await tryGetReadModel(store, CACHE_KEY);
  if (!cached) return null;
  if (cached.schemaVersion !== GARAGE_SCHEMA_VERSION) {
    await tryRemoveReadModel(store, CACHE_KEY);
    return null;
  }
  try {
    return parseGarageSnapshot(cached.payload);
  } catch {
    await tryRemoveReadModel(store, CACHE_KEY);
    return null;
  }
}

export function useGarage(input: {
  accessToken: string;
  disableOnline?: boolean;
  initialSnapshot?: GarageSnapshot;
  store: OfflineStore;
  syncStatus: string;
}) {
  const [snapshot, setSnapshot] = useState<GarageSnapshot | null>(
    input.initialSnapshot ?? null,
  );
  const [online, setOnline] = useState(
    () => !input.disableOnline && navigator.onLine,
  );
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
    const cached = input.initialSnapshot ?? (await cachedSnapshot(input.store));
    if (version !== requestVersion.current) return;
    if (cached) {
      setSnapshot(cached);
      setSource("CACHE");
    }
    if (input.disableOnline || !online) {
      setMessage(
        input.disableOnline
          ? null
          : cached
            ? "Encrypted offline copy — connect to update vehicle records."
            : "Connect once to save the Garage on this device.",
      );
      setLoading(false);
      return;
    }
    try {
      const remote = await loadMobileGarage(input.accessToken);
      if (version !== requestVersion.current) return;
      await cacheSnapshot(input.store, remote);
      setSnapshot(remote);
      setSource("NETWORK");
      setMessage(null);
    } catch (reason) {
      if (version !== requestVersion.current) return;
      setMessage(
        cached
          ? "Could not refresh. Showing the encrypted Garage copy saved on this device."
          : reason instanceof Error
            ? reason.message
            : "The Garage could not be loaded.",
      );
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [
    input.accessToken,
    input.disableOnline,
    input.initialSnapshot,
    input.store,
    online,
  ]);

  useEffect(() => {
    void refresh();
    return () => {
      requestVersion.current += 1;
    };
  }, [refresh, input.syncStatus]);

  const mutate = useCallback(
    async (mutation: GarageDraftMutation) => {
      if (!online || input.disableOnline || !snapshot) {
        setMessage("Connect to change vehicle records.");
        return false;
      }
      setBusy(true);
      setMessage(null);
      try {
        const next = await mutateMobileGarage(
          input.accessToken,
          mutation,
          snapshot.revision,
        );
        await cacheSnapshot(input.store, next);
        setSnapshot(next);
        setSource("NETWORK");
        setMessage("Garage updated securely.");
        return true;
      } catch (reason) {
        if (reason instanceof GarageConflictError) {
          await cacheSnapshot(input.store, reason.snapshot);
          setSnapshot(reason.snapshot);
          setSource("NETWORK");
          if (mutation.operation === "ADD_VEHICLE"
            && reason.snapshot.vehicles.some((vehicle) => vehicle.id === mutation.vehicleId)) {
            setMessage("Vehicle added securely.");
            return true;
          }
        }
        setMessage(
          reason instanceof Error
            ? reason.message
            : "The Garage could not be updated.",
        );
        return false;
      } finally {
        setBusy(false);
      }
    },
    [input.accessToken, input.disableOnline, input.store, online, snapshot],
  );

  return { busy, loading, message, mutate, online, refresh, snapshot, source };
}
