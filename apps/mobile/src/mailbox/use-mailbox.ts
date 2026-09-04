import { useCallback, useEffect, useRef, useState } from "react";

import type { JsonObject } from "@diarydock/contracts";
import { MAILBOX_SCHEMA_VERSION, parseMailboxSnapshot, type MailboxAction,
  type MailboxItem, type MailboxSnapshot } from "@diarydock/mailbox";
import { type OfflineStore, tryGetReadModel, tryPutReadModel,
  tryRemoveReadModel } from "@diarydock/offline-store";

import { loadMobileMailbox, MailboxConflictError, routeMobileMailboxItem } from "./mailbox-client";

const CACHE_KEY = "mailbox";

async function cache(store: OfflineStore, snapshot: MailboxSnapshot) {
  await tryPutReadModel(store, CACHE_KEY, MAILBOX_SCHEMA_VERSION,
    snapshot as unknown as JsonObject);
}

async function cached(store: OfflineStore) {
  const value = await tryGetReadModel(store, CACHE_KEY);
  if (!value) return null;
  if (value.schemaVersion !== MAILBOX_SCHEMA_VERSION) {
    await tryRemoveReadModel(store, CACHE_KEY);
    return null;
  }
  try { return parseMailboxSnapshot(value.payload); }
  catch { await tryRemoveReadModel(store, CACHE_KEY); return null; }
}

export function useMailbox(input: { accessToken: string; disableOnline?: boolean;
  initialSnapshot?: MailboxSnapshot; store: OfflineStore; syncStatus: string }) {
  const [snapshot, setSnapshot] = useState<MailboxSnapshot | null>(input.initialSnapshot ?? null);
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
    const local = await cached(input.store);
    if (current !== version.current) return;
    if (local) setSnapshot(local);
    if (input.disableOnline || !online) {
      setMessage(local ? "Encrypted offline copy — connect to file incoming items."
        : "Connect once to keep Mailbox available offline.");
      setLoading(false); return;
    }
    try {
      const remote = await loadMobileMailbox(input.accessToken);
      if (current !== version.current) return;
      await cache(input.store, remote); setSnapshot(remote); setMessage(null);
    } catch (reason) {
      if (current === version.current) setMessage(local
        ? "Could not refresh. Showing the encrypted Mailbox copy."
        : reason instanceof Error ? reason.message : "Mailbox could not be loaded.");
    } finally { if (current === version.current) setLoading(false); }
  }, [input.accessToken, input.disableOnline, input.store, online]);

  useEffect(() => { void refresh(); return () => { version.current += 1; }; },
    [refresh, input.syncStatus]);

  const route = useCallback(async (item: MailboxItem, action: MailboxAction) => {
    if (!online || !snapshot) { setMessage("Connect to file a Mailbox item."); return false; }
    setBusy(true); setMessage(null);
    try {
      const next = await routeMobileMailboxItem(input.accessToken, {
        action, itemId: item.id, itemRevision: item.updatedAt,
      });
      await cache(input.store, next); setSnapshot(next); setMessage("Mailbox updated securely.");
      return true;
    } catch (reason) {
      if (reason instanceof MailboxConflictError) {
        await cache(input.store, reason.snapshot); setSnapshot(reason.snapshot);
      }
      setMessage(reason instanceof Error ? reason.message : "Mailbox could not be updated.");
      return false;
    } finally { setBusy(false); }
  }, [input.accessToken, input.store, online, snapshot]);

  return { busy, loading, message, online, refresh, route, snapshot };
}
