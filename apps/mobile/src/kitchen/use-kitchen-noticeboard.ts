import { useCallback, useEffect, useRef, useState } from "react";

import type { JsonObject } from "@diarydock/contracts";
import {
  KITCHEN_NOTICEBOARD_SCHEMA_VERSION,
  parseKitchenNoticeboardSnapshot,
  type KitchenNoticeboardSnapshot,
} from "@diarydock/kitchen";
import { type OfflineStore, tryGetReadModel, tryPutReadModel,
  tryRemoveReadModel } from "@diarydock/offline-store";

import {
  loadMobileNoticeboard,
  mutateMobileNoticeboard,
  NoticeboardConflictError,
  type NoticeDraftMutation,
} from "./noticeboard-client";

const CACHE_KEY = "kitchen-noticeboard";

async function cache(store: OfflineStore, snapshot: KitchenNoticeboardSnapshot) {
  await tryPutReadModel(store, CACHE_KEY, KITCHEN_NOTICEBOARD_SCHEMA_VERSION,
    snapshot as unknown as JsonObject);
}

async function readCache(store: OfflineStore) {
  const item = await tryGetReadModel(store, CACHE_KEY);
  if (!item) return null;
  if (item.schemaVersion !== KITCHEN_NOTICEBOARD_SCHEMA_VERSION) {
    await tryRemoveReadModel(store, CACHE_KEY);
    return null;
  }
  try { return parseKitchenNoticeboardSnapshot(item.payload); } catch {
    await tryRemoveReadModel(store, CACHE_KEY);
    return null;
  }
}

export function useKitchenNoticeboard(input: {
  accessToken: string;
  disableOnline?: boolean;
  initialSnapshot?: KitchenNoticeboardSnapshot;
  store: OfflineStore;
  syncStatus: string;
}) {
  const [snapshot, setSnapshot] = useState<KitchenNoticeboardSnapshot | null>(input.initialSnapshot ?? null);
  const [online, setOnline] = useState(() => !input.disableOnline && navigator.onLine);
  const [loading, setLoading] = useState(!input.initialSnapshot);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [source, setSource] = useState<"CACHE" | "NETWORK">("CACHE");
  const requestVersion = useRef(0);

  useEffect(() => {
    const connected = () => setOnline(!input.disableOnline);
    const disconnected = () => setOnline(false);
    window.addEventListener("online", connected);
    window.addEventListener("offline", disconnected);
    return () => { window.removeEventListener("online", connected); window.removeEventListener("offline", disconnected); };
  }, [input.disableOnline]);

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    const local = input.initialSnapshot ?? await readCache(input.store);
    if (version !== requestVersion.current) return;
    if (local) { setSnapshot(local); setSource("CACHE"); }
    if (!online || input.disableOnline) {
      setMessage(input.disableOnline ? null : local
        ? "Encrypted offline copy — connect to change the board."
        : "Connect once to save the noticeboard on this device.");
      setLoading(false);
      return;
    }
    try {
      const remote = await loadMobileNoticeboard(input.accessToken);
      if (version !== requestVersion.current) return;
      await cache(input.store, remote);
      setSnapshot(remote); setSource("NETWORK"); setMessage(null);
    } catch (reason) {
      if (version !== requestVersion.current) return;
      setMessage(local ? "Could not refresh. Showing the encrypted copy saved on this device."
        : reason instanceof Error ? reason.message : "The noticeboard could not be loaded.");
    } finally { if (version === requestVersion.current) setLoading(false); }
  }, [input.accessToken, input.disableOnline, input.initialSnapshot, input.store, online]);

  useEffect(() => { void refresh(); return () => { requestVersion.current += 1; }; }, [refresh, input.syncStatus]);

  const mutate = useCallback(async (mutation: NoticeDraftMutation) => {
    if (!online || input.disableOnline || !snapshot) {
      setMessage("Connect to change the noticeboard."); return false;
    }
    setBusy(true); setMessage(null);
    try {
      const next = await mutateMobileNoticeboard(input.accessToken, mutation, snapshot.revision);
      await cache(input.store, next);
      setSnapshot(next); setSource("NETWORK"); setMessage("Noticeboard updated securely.");
      return true;
    } catch (reason) {
      if (reason instanceof NoticeboardConflictError) {
        await cache(input.store, reason.snapshot); setSnapshot(reason.snapshot); setSource("NETWORK");
      }
      setMessage(reason instanceof Error ? reason.message : "The noticeboard could not be updated.");
      return false;
    } finally { setBusy(false); }
  }, [input.accessToken, input.disableOnline, input.store, online, snapshot]);

  return { busy, loading, message, mutate, online, refresh, snapshot, source };
}
