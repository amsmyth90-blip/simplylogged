import { useCallback, useEffect, useRef, useState } from "react";

import type { JsonObject } from "@diarydock/contracts";
import {
  KITCHEN_CALENDAR_SCHEMA_VERSION,
  parseKitchenCalendarSnapshot,
  type KitchenCalendarSnapshot,
} from "@diarydock/kitchen";
import { type OfflineStore, tryGetReadModel, tryPutReadModel,
  tryRemoveReadModel } from "@diarydock/offline-store";

import {
  KitchenCalendarConflictError,
  loadMobileKitchenCalendar,
  mutateMobileKitchenCalendar,
  type KitchenCalendarDraftMutation,
} from "./calendar-client";

const CACHE_KEY = "kitchen-calendar";

async function cache(store: OfflineStore, snapshot: KitchenCalendarSnapshot) {
  await tryPutReadModel(store, CACHE_KEY, KITCHEN_CALENDAR_SCHEMA_VERSION,
    snapshot as unknown as JsonObject);
}

async function cached(store: OfflineStore) {
  const value = await tryGetReadModel(store, CACHE_KEY);
  if (!value) return null;
  if (value.schemaVersion !== KITCHEN_CALENDAR_SCHEMA_VERSION) {
    await tryRemoveReadModel(store, CACHE_KEY); return null;
  }
  try { return parseKitchenCalendarSnapshot(value.payload); }
  catch { await tryRemoveReadModel(store, CACHE_KEY); return null; }
}

export function useKitchenCalendar(input: {
  accessToken: string;
  disableOnline?: boolean;
  initialSnapshot?: KitchenCalendarSnapshot;
  store: OfflineStore;
  syncStatus: string;
}) {
  const [snapshot, setSnapshot] = useState<KitchenCalendarSnapshot | null>(
    input.initialSnapshot ?? null,
  );
  const [online, setOnline] = useState(() => input.disableOnline ? false : navigator.onLine);
  const [loading, setLoading] = useState(!input.initialSnapshot);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const version = useRef(0);

  useEffect(() => {
    if (input.disableOnline) return;
    const connected = () => setOnline(true);
    const disconnected = () => setOnline(false);
    window.addEventListener("online", connected); window.addEventListener("offline", disconnected);
    return () => { window.removeEventListener("online", connected);
      window.removeEventListener("offline", disconnected); };
  }, [input.disableOnline]);

  const refresh = useCallback(async () => {
    const current = ++version.current;
    setLoading(true);
    const local = input.initialSnapshot ?? await cached(input.store);
    if (current !== version.current) return;
    if (local) setSnapshot(local);
    if (input.disableOnline || !online) {
      setMessage(local ? "Encrypted offline copy — connect to change the calendar."
        : "Connect once to keep the family calendar available offline.");
      setLoading(false); return;
    }
    try {
      const remote = await loadMobileKitchenCalendar(input.accessToken);
      if (current !== version.current) return;
      await cache(input.store, remote); setSnapshot(remote); setMessage(null);
    } catch (reason) {
      if (current === version.current) setMessage(local
        ? "Could not refresh. Showing the encrypted family calendar copy."
        : reason instanceof Error ? reason.message : "The calendar could not be loaded.");
    } finally { if (current === version.current) setLoading(false); }
  }, [input.accessToken, input.disableOnline, input.initialSnapshot, input.store, online]);

  useEffect(() => { void refresh(); return () => { version.current += 1; }; },
    [refresh, input.syncStatus]);

  const mutate = useCallback(async (mutation: KitchenCalendarDraftMutation) => {
    if (!online || input.disableOnline || !snapshot) {
      setMessage("Connect to change the family calendar."); return false;
    }
    setBusy(true); setMessage(null);
    try {
      const next = await mutateMobileKitchenCalendar(
        input.accessToken, mutation, snapshot.revision,
      );
      await cache(input.store, next); setSnapshot(next);
      setMessage("Family calendar updated securely."); return true;
    } catch (reason) {
      if (reason instanceof KitchenCalendarConflictError) {
        await cache(input.store, reason.snapshot); setSnapshot(reason.snapshot);
      }
      setMessage(reason instanceof Error ? reason.message : "The calendar could not be updated.");
      return false;
    } finally { setBusy(false); }
  }, [input.accessToken, input.disableOnline, input.store, online, snapshot]);

  return { busy, loading, message, mutate, online, refresh, snapshot };
}
