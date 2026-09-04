import { useCallback, useEffect, useRef, useState } from "react";

import type { JsonObject } from "@diarydock/contracts";
import {
  OFFICE_CORRESPONDENCE_DETAIL_SCHEMA_VERSION,
  OFFICE_CORRESPONDENCE_SCHEMA_VERSION,
  parseOfficeCorrespondenceDetail,
  parseOfficeCorrespondenceSnapshot,
  type OfficeCorrespondence,
  type OfficeCorrespondenceDetail,
  type OfficeCorrespondenceSnapshot,
} from "@diarydock/office";
import { type OfflineStore, tryGetReadModel, tryPutReadModel,
  tryRemoveReadModel } from "@diarydock/offline-store";

import { readModelCacheKey } from "@mobile/data/offline/read-model-cache-key";
import {
  loadMobileOfficeCorrespondenceDetail,
  loadMobileOfficeCorrespondence,
  mutateMobileOfficeCorrespondence,
  OfficeCorrespondenceConflictError,
  type OfficeCorrespondenceDraftMutation,
} from "./correspondence-client";

const CACHE_KEY = "office-correspondence";

async function cacheSnapshot(store: OfflineStore, snapshot: OfficeCorrespondenceSnapshot) {
  await tryPutReadModel(store,
    CACHE_KEY,
    OFFICE_CORRESPONDENCE_SCHEMA_VERSION,
    snapshot as unknown as JsonObject,
  );
}

async function cachedSnapshot(store: OfflineStore) {
  const cached = await tryGetReadModel(store, CACHE_KEY);
  if (!cached) return null;
  if (cached.schemaVersion !== OFFICE_CORRESPONDENCE_SCHEMA_VERSION) {
    await tryRemoveReadModel(store, CACHE_KEY);
    return null;
  }
  try {
    return parseOfficeCorrespondenceSnapshot(cached.payload);
  } catch {
    await tryRemoveReadModel(store, CACHE_KEY);
    return null;
  }
}

async function detailCacheKey(correspondenceId: string) {
  return readModelCacheKey("office-correspondence-detail", correspondenceId);
}

async function cacheDetail(store: OfflineStore, detail: OfficeCorrespondenceDetail) {
  try {
    await tryPutReadModel(store, await detailCacheKey(detail.correspondence.id),
      OFFICE_CORRESPONDENCE_DETAIL_SCHEMA_VERSION, detail as unknown as JsonObject);
  } catch { /* Best effort; the owner-scoped server record remains authoritative. */ }
}

async function cachedDetail(store: OfflineStore, correspondenceId: string) {
  const key = await detailCacheKey(correspondenceId);
  try {
    const value = await tryGetReadModel(store, key);
    if (!value) return null;
    if (value.schemaVersion !== OFFICE_CORRESPONDENCE_DETAIL_SCHEMA_VERSION) {
      await tryRemoveReadModel(store, key); return null;
    }
    const detail = parseOfficeCorrespondenceDetail(value.payload);
    if (detail.correspondence.id !== correspondenceId) {
      await tryRemoveReadModel(store, key); return null;
    }
    return detail;
  } catch { await tryRemoveReadModel(store, key); return null; }
}

function withDetail(snapshot: OfficeCorrespondenceSnapshot,
  correspondence: OfficeCorrespondence) {
  return { ...snapshot, correspondence: snapshot.correspondence.map((item) =>
    item.id === correspondence.id ? correspondence : item) };
}

export function useOfficeCorrespondence(input: {
  accessToken: string;
  disableOnline?: boolean;
  initialCorrespondenceSnapshot?: OfficeCorrespondenceSnapshot;
  store: OfflineStore;
  syncStatus: string;
}) {
  const [snapshot, setSnapshot] = useState<OfficeCorrespondenceSnapshot | null>(
    input.initialCorrespondenceSnapshot ?? null,
  );
  const [online, setOnline] = useState(
    () => input.disableOnline ? false : navigator.onLine,
  );
  const [loading, setLoading] = useState(!input.initialCorrespondenceSnapshot);
  const [busy, setBusy] = useState(false);
  const [loadingCorrespondenceId, setLoadingCorrespondenceId] = useState("");
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
      setMessage(cached
        ? "Encrypted offline copy — connect to update correspondence."
        : "Connect once to save Office correspondence on this device.");
      setLoading(false);
      return;
    }
    try {
      const remote = await loadMobileOfficeCorrespondence(input.accessToken);
      if (version !== requestVersion.current) return;
      await cacheSnapshot(input.store, remote);
      setSnapshot(remote);
      setMessage(null);
    } catch (reason) {
      if (version !== requestVersion.current) return;
      setMessage(cached
        ? "Could not refresh. Showing the encrypted correspondence copy."
        : reason instanceof Error ? reason.message : "Correspondence could not be loaded.");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [input.accessToken, input.disableOnline, input.store, online]);

  useEffect(() => {
    void refresh();
    return () => { requestVersion.current += 1; };
  }, [refresh, input.syncStatus]);

  const loadCorrespondence = useCallback(async (correspondenceId: string) => {
    const summary = snapshot?.correspondence.find((item) => item.id === correspondenceId);
    if (!summary) return null;
    if (summary.contentComplete) return summary;
    setLoadingCorrespondenceId(correspondenceId); setMessage(null);
    try {
      const local = await cachedDetail(input.store, correspondenceId);
      if (local?.correspondence.updatedAt === summary.updatedAt) {
        setSnapshot((current) => current ? withDetail(current, local.correspondence) : current);
        return local.correspondence;
      }
      if (input.disableOnline || !online) {
        setMessage("Connect once to save this correspondence's full details on your device.");
        return null;
      }
      const detail = await loadMobileOfficeCorrespondenceDetail(
        input.accessToken, correspondenceId,
      );
      if (detail.correspondence.updatedAt !== summary.updatedAt) {
        await refresh(); setMessage("This correspondence changed, so Office has been refreshed.");
        return null;
      }
      setSnapshot((current) => current ? withDetail(current, detail.correspondence) : current);
      await cacheDetail(input.store, detail); return detail.correspondence;
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message
        : "The full correspondence could not be opened.");
      return null;
    } finally { setLoadingCorrespondenceId(""); }
  }, [input.accessToken, input.disableOnline, input.store, online, refresh, snapshot]);

  const mutate = useCallback(async (mutation: OfficeCorrespondenceDraftMutation) => {
    if (!online || !snapshot) {
      setMessage("Connect to change Office correspondence.");
      return false;
    }
    setBusy(true);
    setMessage(null);
    try {
      const next = await mutateMobileOfficeCorrespondence(
        input.accessToken,
        mutation,
        snapshot.revision,
      );
      await cacheSnapshot(input.store, next);
      setSnapshot(next);
      setMessage("Office correspondence saved securely.");
      return true;
    } catch (reason) {
      if (reason instanceof OfficeCorrespondenceConflictError) {
        await cacheSnapshot(input.store, reason.snapshot);
        setSnapshot(reason.snapshot);
      }
      setMessage(reason instanceof Error ? reason.message : "Correspondence could not be saved.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [input.accessToken, input.store, online, snapshot]);

  return { busy, loadCorrespondence, loading, loadingCorrespondenceId,
    message, mutate, online, refresh, snapshot };
}
