import { useCallback, useEffect, useRef, useState } from "react";

import type { JsonObject } from "@diarydock/contracts";
import {
  ONBOARDING_SCHEMA_VERSION,
  parseOnboardingSnapshot,
  type OnboardingMutation,
  type OnboardingSnapshot,
} from "@diarydock/onboarding";
import { type OfflineStore, tryGetReadModel, tryPutReadModel,
  tryRemoveReadModel } from "@diarydock/offline-store";

import {
  loadMobileOnboarding,
  OnboardingConflictError,
  saveMobileOnboarding,
} from "./onboarding-client";

const CACHE_KEY = "onboarding";
async function cache(store: OfflineStore, snapshot: OnboardingSnapshot) {
  await tryPutReadModel(store, CACHE_KEY, ONBOARDING_SCHEMA_VERSION,
    snapshot as unknown as JsonObject);
}
async function cached(store: OfflineStore) {
  const value = await tryGetReadModel(store, CACHE_KEY);
  if (!value) return null;
  if (value.schemaVersion !== ONBOARDING_SCHEMA_VERSION) {
    await tryRemoveReadModel(store, CACHE_KEY); return null;
  }
  try { return parseOnboardingSnapshot(value.payload); }
  catch { await tryRemoveReadModel(store, CACHE_KEY); return null; }
}

export function useMobileOnboarding(input: { accessToken: string; disableOnline?: boolean;
  initialSnapshot?: OnboardingSnapshot; store: OfflineStore; syncStatus: string }) {
  const [snapshot, setSnapshot] = useState<OnboardingSnapshot | null>(input.initialSnapshot ?? null);
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
    const current = ++version.current; setLoading(true);
    const local = input.initialSnapshot ?? await cached(input.store);
    if (current !== version.current) return; if (local) setSnapshot(local);
    if (!online || input.disableOnline) { setMessage(local
      ? "Encrypted offline copy — connect to change your setup."
      : "Connect once to finish setting up this device."); setLoading(false); return; }
    try { const remote = await loadMobileOnboarding(input.accessToken);
      if (current !== version.current) return; await cache(input.store, remote);
      setSnapshot(remote); setMessage(null); }
    catch (error) { if (current === version.current) setMessage(local
      ? "Could not refresh. Showing your encrypted setup copy."
      : error instanceof Error ? error.message : "Setup could not be opened."); }
    finally { if (current === version.current) setLoading(false); }
  }, [input.accessToken, input.disableOnline, input.initialSnapshot, input.store, online]);

  useEffect(() => { void refresh(); return () => { version.current += 1; }; },
    [refresh, input.syncStatus]);

  const save = useCallback(async (mutation: Omit<OnboardingMutation, "revision">) => {
    if (!online || input.disableOnline || !snapshot) {
      setMessage("Connect to save your DiaryDock setup."); return null;
    }
    setBusy(true); setMessage(null);
    try { const next = await saveMobileOnboarding(input.accessToken,
      { ...mutation, revision: snapshot.revision }); await cache(input.store, next);
      await tryRemoveReadModel(input.store, "life-check"); setSnapshot(next);
      setMessage("Your DiaryDock setup is saved."); return next; }
    catch (error) { if (error instanceof OnboardingConflictError) {
      await cache(input.store, error.snapshot); setSnapshot(error.snapshot); }
      setMessage(error instanceof Error ? error.message : "Setup could not be saved."); return null; }
    finally { setBusy(false); }
  }, [input.accessToken, input.disableOnline, input.store, online, snapshot]);

  return { busy, loading, message, online, refresh, save, snapshot };
}

export type MobileOnboardingModel = ReturnType<typeof useMobileOnboarding>;
