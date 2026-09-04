import { useCallback, useEffect, useRef, useState } from "react";

import type { JsonObject } from "@diarydock/contracts";
import {
  OFFICE_CONTACT_DETAIL_SCHEMA_VERSION,
  OFFICE_CONTACTS_SCHEMA_VERSION,
  parseOfficeContactDetail,
  parseOfficeContactsSnapshot,
  type OfficeContact,
  type OfficeContactDetail,
  type OfficeContactsSnapshot,
} from "@diarydock/office";
import { type OfflineStore, tryGetReadModel, tryPutReadModel,
  tryRemoveReadModel } from "@diarydock/offline-store";

import { readModelCacheKey } from "@mobile/data/offline/read-model-cache-key";
import {
  loadMobileOfficeContactDetail,
  loadMobileOfficeContacts,
  mutateMobileOfficeContacts,
  OfficeContactsConflictError,
  type OfficeContactsDraftMutation,
} from "./contacts-client";

const CACHE_KEY = "office-contacts";

async function cacheSnapshot(store: OfflineStore, snapshot: OfficeContactsSnapshot) {
  await tryPutReadModel(store,
    CACHE_KEY,
    OFFICE_CONTACTS_SCHEMA_VERSION,
    snapshot as unknown as JsonObject,
  );
}

async function cachedSnapshot(store: OfflineStore) {
  const cached = await tryGetReadModel(store, CACHE_KEY);
  if (!cached) return null;
  if (cached.schemaVersion !== OFFICE_CONTACTS_SCHEMA_VERSION) {
    await tryRemoveReadModel(store, CACHE_KEY);
    return null;
  }
  try {
    return parseOfficeContactsSnapshot(cached.payload);
  } catch {
    await tryRemoveReadModel(store, CACHE_KEY);
    return null;
  }
}

async function detailCacheKey(contactId: string) {
  return readModelCacheKey("office-contact", contactId);
}

async function cacheDetail(store: OfflineStore, detail: OfficeContactDetail) {
  try {
    await tryPutReadModel(store, await detailCacheKey(detail.contact.id),
      OFFICE_CONTACT_DETAIL_SCHEMA_VERSION, detail as unknown as JsonObject);
  } catch { /* Best effort; the owner-scoped server record remains authoritative. */ }
}

async function cachedDetail(store: OfflineStore, contactId: string) {
  const key = await detailCacheKey(contactId);
  try {
    const value = await tryGetReadModel(store, key);
    if (!value) return null;
    if (value.schemaVersion !== OFFICE_CONTACT_DETAIL_SCHEMA_VERSION) {
      await tryRemoveReadModel(store, key); return null;
    }
    const detail = parseOfficeContactDetail(value.payload);
    if (detail.contact.id !== contactId) { await tryRemoveReadModel(store, key); return null; }
    return detail;
  } catch { await tryRemoveReadModel(store, key); return null; }
}

function withDetail(snapshot: OfficeContactsSnapshot, contact: OfficeContact) {
  return { ...snapshot, contacts: snapshot.contacts.map((item) =>
    item.id === contact.id ? contact : item) };
}

export function useOfficeContacts(input: {
  accessToken: string;
  disableOnline?: boolean;
  initialContactsSnapshot?: OfficeContactsSnapshot;
  store: OfflineStore;
  syncStatus: string;
}) {
  const [snapshot, setSnapshot] = useState<OfficeContactsSnapshot | null>(
    input.initialContactsSnapshot ?? null,
  );
  const [online, setOnline] = useState(
    () => input.disableOnline ? false : navigator.onLine,
  );
  const [loading, setLoading] = useState(!input.initialContactsSnapshot);
  const [busy, setBusy] = useState(false);
  const [loadingContactId, setLoadingContactId] = useState("");
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
        ? "Encrypted offline copy — connect to update contacts."
        : "Connect once to save Office contacts on this device.");
      setLoading(false);
      return;
    }
    try {
      const remote = await loadMobileOfficeContacts(input.accessToken);
      if (version !== requestVersion.current) return;
      await cacheSnapshot(input.store, remote);
      setSnapshot(remote);
      setMessage(null);
    } catch (reason) {
      if (version !== requestVersion.current) return;
      setMessage(cached
        ? "Could not refresh. Showing the encrypted contacts copy."
        : reason instanceof Error ? reason.message : "Contacts could not be loaded.");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [input.accessToken, input.disableOnline, input.store, online]);

  useEffect(() => {
    void refresh();
    return () => { requestVersion.current += 1; };
  }, [refresh, input.syncStatus]);

  const loadContact = useCallback(async (contactId: string) => {
    const summary = snapshot?.contacts.find((item) => item.id === contactId);
    if (!summary) return null;
    if (summary.contentComplete) return summary;
    setLoadingContactId(contactId); setMessage(null);
    try {
      const local = await cachedDetail(input.store, contactId);
      if (local?.contact.updatedAt === summary.updatedAt) {
        setSnapshot((current) => current ? withDetail(current, local.contact) : current);
        return local.contact;
      }
      if (input.disableOnline || !online) {
        setMessage("Connect once to save this contact's full details on your device."); return null;
      }
      const detail = await loadMobileOfficeContactDetail(input.accessToken, contactId);
      if (detail.contact.updatedAt !== summary.updatedAt) {
        await refresh(); setMessage("This contact changed, so Office has been refreshed.");
        return null;
      }
      setSnapshot((current) => current ? withDetail(current, detail.contact) : current);
      await cacheDetail(input.store, detail); return detail.contact;
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "The full contact could not be opened.");
      return null;
    } finally { setLoadingContactId(""); }
  }, [input.accessToken, input.disableOnline, input.store, online, refresh, snapshot]);

  const mutate = useCallback(async (mutation: OfficeContactsDraftMutation) => {
    if (!online || !snapshot) {
      setMessage("Connect to change Office contacts.");
      return false;
    }
    setBusy(true);
    setMessage(null);
    try {
      const next = await mutateMobileOfficeContacts(
        input.accessToken,
        mutation,
        snapshot.revision,
      );
      await cacheSnapshot(input.store, next);
      setSnapshot(next);
      setMessage("Office contacts saved securely.");
      return true;
    } catch (reason) {
      if (reason instanceof OfficeContactsConflictError) {
        await cacheSnapshot(input.store, reason.snapshot);
        setSnapshot(reason.snapshot);
      }
      setMessage(reason instanceof Error ? reason.message : "Contacts could not be saved.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [input.accessToken, input.store, online, snapshot]);

  return { busy, loadContact, loading, loadingContactId,
    message, mutate, online, refresh, snapshot };
}
