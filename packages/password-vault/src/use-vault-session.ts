"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { VaultSession, type VaultTransport } from "./session.ts";

export function useVaultSession(accountId: string, transport: VaultTransport) {
  const session = useMemo(() => new VaultSession(accountId, transport), [accountId, transport]);
  const view = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  useEffect(() => {
    // Defer initial work so React Strict Mode's trial cleanup cannot invalidate it.
    const start = setTimeout(() => {
      void session.load().catch(() => undefined);
    }, 0);
    const hidden = () => {
      if (document.hidden) session.lock();
    };
    window.addEventListener("pagehide", session.lock);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      clearTimeout(start);
      session.lock();
      window.removeEventListener("pagehide", session.lock);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [session]);
  useEffect(() => {
    if (!view.unlocked) return;
    let deadline = Date.now() + 5 * 60_000;
    let timer: ReturnType<typeof setTimeout>;
    const activity = () => {
      if (Date.now() >= deadline) {
        session.lock();
        return;
      }
      deadline = Date.now() + 5 * 60_000;
      clearTimeout(timer);
      timer = setTimeout(session.lock, 5 * 60_000);
    };
    timer = setTimeout(session.lock, 5 * 60_000);
    window.addEventListener("pointerdown", activity, { passive: true });
    window.addEventListener("keydown", activity);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", activity);
      window.removeEventListener("keydown", activity);
    };
  }, [session, view.unlocked]);
  return {
    ...view,
    lock: session.lock,
    open: session.open,
    create: session.create,
    save: session.save,
    remove: session.remove,
    refresh: session.load,
    clearError: session.clearError,
  };
}
