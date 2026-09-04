import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { JsonObject } from "@diarydock/contracts";
import { DocumentService, type DocumentSummary } from "@diarydock/documents";
import {
  EMERGENCY_SCHEMA_VERSION,
  parseEmergencySnapshot,
  type EmergencySnapshot,
} from "@diarydock/emergency";
import { type OfflineStore, tryGetReadModel, tryPutReadModel,
  tryRemoveReadModel } from "@diarydock/offline-store";

import {
  EmergencyConflictError,
  loadMobileEmergency,
  mutateMobileEmergency,
  type EmergencyDraftMutation,
} from "./emergency-client";

const CACHE_KEY = "emergency-briefing";

async function cacheSnapshot(store: OfflineStore, snapshot: EmergencySnapshot) {
  await tryPutReadModel(store,
    CACHE_KEY,
    EMERGENCY_SCHEMA_VERSION,
    snapshot as unknown as JsonObject,
  );
}

async function cachedSnapshot(store: OfflineStore) {
  const cached = await tryGetReadModel(store, CACHE_KEY);
  if (!cached) return null;
  if (cached.schemaVersion !== EMERGENCY_SCHEMA_VERSION) {
    await tryRemoveReadModel(store, CACHE_KEY);
    return null;
  }
  try {
    return parseEmergencySnapshot(cached.payload);
  } catch {
    await tryRemoveReadModel(store, CACHE_KEY);
    return null;
  }
}

export function useEmergency(input: {
  accessToken: string;
  disableOnline?: boolean;
  initialSnapshot?: EmergencySnapshot;
  store: OfflineStore;
  syncStatus: string;
}) {
  const documentsService = useMemo(() => new DocumentService(input.store), [input.store]);
  const [snapshot, setSnapshot] = useState<EmergencySnapshot | null>(input.initialSnapshot ?? null);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
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
    const [cached, localDocuments] = await Promise.all([
      input.initialSnapshot ? Promise.resolve(input.initialSnapshot) : cachedSnapshot(input.store),
      documentsService.list().catch(() => []),
    ]);
    if (version !== requestVersion.current) return;
    setDocuments(localDocuments.filter((item) => item.emergencyVisible));
    if (cached) { setSnapshot(cached); setSource("CACHE"); }
    if (input.disableOnline || !online) {
      setMessage(input.disableOnline ? null : cached
        ? "Encrypted offline copy — connect to add or refresh information."
        : "Connect once to save Emergency information on this device.");
      setLoading(false);
      return;
    }
    try {
      const remote = await loadMobileEmergency(input.accessToken);
      if (version !== requestVersion.current) return;
      await cacheSnapshot(input.store, remote);
      setSnapshot(remote);
      setSource("NETWORK");
      setMessage(null);
    } catch (reason) {
      if (version !== requestVersion.current) return;
      setMessage(cached
        ? "Could not refresh. Showing the encrypted copy saved on this device."
        : reason instanceof Error ? reason.message : "Emergency information could not be loaded.");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [documentsService, input.accessToken, input.disableOnline, input.initialSnapshot, input.store, online]);

  useEffect(() => {
    void refresh();
    return () => { requestVersion.current += 1; };
  }, [refresh, input.syncStatus]);

  const mutate = useCallback(async (mutation: EmergencyDraftMutation) => {
    if (!online || input.disableOnline || !snapshot) {
      setMessage("Connect to add Emergency information.");
      return false;
    }
    setBusy(true);
    setMessage(null);
    try {
      const next = await mutateMobileEmergency(input.accessToken, mutation, snapshot.revision);
      await cacheSnapshot(input.store, next);
      setSnapshot(next);
      setSource("NETWORK");
      setMessage("Emergency information saved securely.");
      return true;
    } catch (reason) {
      if (reason instanceof EmergencyConflictError) {
        await cacheSnapshot(input.store, reason.snapshot);
        setSnapshot(reason.snapshot);
        setSource("NETWORK");
      }
      setMessage(reason instanceof Error ? reason.message : "Emergency information could not be saved.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [input.accessToken, input.disableOnline, input.store, online, snapshot]);

  return { busy, documents, loading, message, mutate, online, refresh, snapshot, source };
}
