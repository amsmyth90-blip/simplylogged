import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { OfflineStore } from "@diarydock/offline-store";

import { DocumentUploadEngine } from "@mobile/capture/upload-engine";
import { UploadTransportError } from "@mobile/capture/upload-transport-error";
import { getDeviceId } from "@mobile/platform/device-id";

import { HttpSyncClient, SyncTransportError } from "./http-sync-client";
import { nextBackgroundSyncDelay } from "./sync-schedule";
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
    let timer: number | null = null;
    const schedule = () => {
      if (cancelled) return;
      timer = window.setTimeout(async () => {
        if (document.visibilityState === "visible") await synchronize();
        schedule();
      }, nextBackgroundSyncDelay());
    };
    const onOnline = () => void synchronize();
    const onOffline = () => setStatus("OFFLINE");
    const onVisibility = () => {
      if (document.visibilityState === "visible") void synchronize();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisibility);
    void synchronize().finally(schedule);

    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [synchronize]);

  return { status, synchronize };
}
