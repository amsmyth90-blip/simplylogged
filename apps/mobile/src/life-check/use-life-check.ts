import { useCallback, useEffect, useRef, useState } from "react";

import type { JsonObject } from "@diarydock/contracts";
import {
  LIFE_CHECK_SCHEMA_VERSION,
  parseLifeCheckSnapshot,
  type LifeCheckField,
  type LifeCheckSnapshot,
} from "@diarydock/life-check";
import { type OfflineStore, tryGetReadModel, tryPutReadModel,
  tryRemoveReadModel } from "@diarydock/offline-store";

import { LifeCheckConflictError, loadMobileLifeCheck, updateMobileLifeCheck } from "./life-check-client";

const CACHE_KEY = "life-check";
async function cache(store: OfflineStore, snapshot: LifeCheckSnapshot) {
  await tryPutReadModel(store, CACHE_KEY, LIFE_CHECK_SCHEMA_VERSION,
    snapshot as unknown as JsonObject);
}
async function cached(store: OfflineStore) {
  const value = await tryGetReadModel(store, CACHE_KEY);
  if (!value) return null;
  if (value.schemaVersion !== LIFE_CHECK_SCHEMA_VERSION) {
    await tryRemoveReadModel(store, CACHE_KEY); return null;
  }
  try { return parseLifeCheckSnapshot(value.payload); }
  catch { await tryRemoveReadModel(store, CACHE_KEY); return null; }
}

export function useLifeCheck(input: { accessToken: string; disableOnline?: boolean;
  initialSnapshot?: LifeCheckSnapshot; store: OfflineStore; syncStatus: string }) {
  const [snapshot, setSnapshot] = useState<LifeCheckSnapshot | null>(input.initialSnapshot ?? null);
  const [online, setOnline] = useState(() => !input.disableOnline && navigator.onLine);
  const [loading, setLoading] = useState(!input.initialSnapshot);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string | null>(null);
  const version = useRef(0);

  useEffect(() => { if (input.disableOnline) return;
    const connected = () => setOnline(true); const disconnected = () => setOnline(false);
    window.addEventListener("online", connected); window.addEventListener("offline", disconnected);
    return () => { window.removeEventListener("online", connected);
      window.removeEventListener("offline", disconnected); }; }, [input.disableOnline]);

  const refresh = useCallback(async () => {
    const current = ++version.current; setLoading(true); const local = input.initialSnapshot
      ?? await cached(input.store);
    if (current !== version.current) return; if (local) setSnapshot(local);
    if (!online || input.disableOnline) { setMessage(local
      ? "Encrypted offline copy — connect to change your answers."
      : "Connect once to keep Life Check available offline."); setLoading(false); return; }
    try { const remote = await loadMobileLifeCheck(input.accessToken);
      if (current !== version.current) return; await cache(input.store, remote);
      setSnapshot(remote); setMessage(null); }
    catch (error) { if (current === version.current) setMessage(local
      ? "Could not refresh. Showing your encrypted Life Check copy."
      : error instanceof Error ? error.message : "Life Check could not be opened."); }
    finally { if (current === version.current) setLoading(false); }
  }, [input.accessToken, input.disableOnline, input.initialSnapshot, input.store, online]);

  useEffect(() => { void refresh(); return () => { version.current += 1; }; },
    [refresh, input.syncStatus]);

  const answer = useCallback(async (field: LifeCheckField, value: string) => {
    if (!online || input.disableOnline || !snapshot) {
      setMessage("Connect to change your Life Check answers."); return;
    }
    setBusy(true); setMessage(null);
    try { const next = await updateMobileLifeCheck(input.accessToken,
      { revision: snapshot.revision, field, value }); await cache(input.store, next);
      setSnapshot(next); setMessage("Life Check updated."); }
    catch (error) { if (error instanceof LifeCheckConflictError) {
      await cache(input.store, error.snapshot); setSnapshot(error.snapshot); }
      setMessage(error instanceof Error ? error.message : "Life Check could not be updated."); }
    finally { setBusy(false); }
  }, [input.accessToken, input.disableOnline, input.store, online, snapshot]);

  return { answer, busy, loading, message, online, snapshot };
}
