import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { OfflineStore } from "@diarydock/offline-store";

import { DocumentUploadEngine } from "@mobile/capture/upload-engine";
import { UploadTransportError } from "@mobile/capture/upload-transport-error";
import { getDeviceId } from "@mobile/platform/device-id";

import { HttpSyncClient, SyncTransportError } from "./http-sync-client";
import { nextBackgroundSyncDelay, nextWakeSyncDelay } from "./sync-schedule";
import { SyncEngine } from "./sync-engine";

export type BackgroundSyncStatus = "OFFLINE" | "READY" | "SIGN_IN_REQUIRED" | "SYNCING";

export function useBackgroundSync(store: OfflineStore, session: Session) {
  const engine = useMemo(
    () => new SyncEngine(store, new HttpSyncClient(), getDeviceId),
    [store],
  );
  const uploads = useMemo(() => new DocumentUploadEngine(store), [store]);
  const [status, setStatus] = useState<BackgroundSyncStatus>(navigator.onLine ? "READY" : "OFFLINE");

  const synchronize = useCallback(async () => {
    if (!navigator.onLine) {
      setStatus("OFFLINE");
      return false;
    }
    setStatus("SYNCING");
    try {
      await uploads.flush(session.access_token);
      await engine.synchronize(session.access_token);
      setStatus("READY");
      return true;
    } catch (error) {
      setStatus((error instanceof SyncTransportError || error instanceof UploadTransportError) && error.status === 401
        ? "SIGN_IN_REQUIRED"
        : "OFFLINE");
      return false;
    }
  }, [engine, session.access_token, uploads]);

  useEffect(() => {
    let cancelled = false;
    let backgroundTimer: number | null = null;
    let wakeTimer: number | null = null;
    const scheduleBackground = () => {
      if (cancelled) return;
      if (backgroundTimer !== null) window.clearTimeout(backgroundTimer);
      backgroundTimer = window.setTimeout(async () => {
        backgroundTimer = null;
        if (document.visibilityState === "visible") await synchronize();
        scheduleBackground();
      }, nextBackgroundSyncDelay());
    };
    const scheduleWake = () => {
      if (cancelled || !navigator.onLine) return;
      if (wakeTimer !== null) window.clearTimeout(wakeTimer);
      wakeTimer = window.setTimeout(async () => {
        wakeTimer = null;
        if (document.visibilityState === "visible") await synchronize();
        scheduleBackground();
      }, nextWakeSyncDelay());
    };
    const onOnline = () => scheduleWake();
    const onOffline = () => {
      if (wakeTimer !== null) window.clearTimeout(wakeTimer);
      wakeTimer = null;
      setStatus("OFFLINE");
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") scheduleWake();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisibility);
    scheduleWake();

    return () => {
      cancelled = true;
      if (backgroundTimer !== null) window.clearTimeout(backgroundTimer);
      if (wakeTimer !== null) window.clearTimeout(wakeTimer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [synchronize]);

  return { status, synchronize };
}
