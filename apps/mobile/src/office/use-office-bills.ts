import { useCallback, useEffect, useRef, useState } from "react";

import type { JsonObject } from "@diarydock/contracts";
import {
  OFFICE_BILL_DETAIL_SCHEMA_VERSION,
  OFFICE_BILLS_SCHEMA_VERSION,
  parseOfficeBillDetail,
  parseOfficeBillsSnapshot,
  type OfficeBill,
  type OfficeBillDetail,
  type OfficeBillsSnapshot,
} from "@diarydock/office";
import { type OfflineStore, tryGetReadModel, tryPutReadModel,
  tryRemoveReadModel } from "@diarydock/offline-store";

import { readModelCacheKey } from "@mobile/data/offline/read-model-cache-key";
import {
  loadMobileOfficeBillDetail,
  loadMobileOfficeBills,
  mutateMobileOfficeBill,
  OfficeBillsConflictError,
  type OfficeBillDraftMutation,
} from "./bills-client";

const CACHE_KEY = "office-bills";

async function cacheSnapshot(store: OfflineStore, snapshot: OfficeBillsSnapshot) {
  await tryPutReadModel(store,
    CACHE_KEY,
    OFFICE_BILLS_SCHEMA_VERSION,
    snapshot as unknown as JsonObject,
  );
}

async function cachedSnapshot(store: OfflineStore) {
  const cached = await tryGetReadModel(store, CACHE_KEY);
  if (!cached) return null;
  if (cached.schemaVersion !== OFFICE_BILLS_SCHEMA_VERSION) {
    await tryRemoveReadModel(store, CACHE_KEY);
    return null;
  }
  try {
    return parseOfficeBillsSnapshot(cached.payload);
  } catch {
    await tryRemoveReadModel(store, CACHE_KEY);
    return null;
  }
}

async function billCacheKey(billId: string) {
  return readModelCacheKey("office-bill", billId);
}

async function cacheBill(store: OfflineStore, detail: OfficeBillDetail) {
  try {
    await tryPutReadModel(store, await billCacheKey(detail.bill.id),
      OFFICE_BILL_DETAIL_SCHEMA_VERSION, detail as unknown as JsonObject);
  } catch { /* Best effort; the owner-scoped server record remains authoritative. */ }
}

async function cachedBill(store: OfflineStore, billId: string) {
  const key = await billCacheKey(billId);
  try {
    const value = await tryGetReadModel(store, key);
    if (!value) return null;
    if (value.schemaVersion !== OFFICE_BILL_DETAIL_SCHEMA_VERSION) {
      await tryRemoveReadModel(store, key); return null;
    }
    const detail = parseOfficeBillDetail(value.payload);
    if (detail.bill.id !== billId) { await tryRemoveReadModel(store, key); return null; }
    return detail;
  } catch { await tryRemoveReadModel(store, key); return null; }
}

function withBill(snapshot: OfficeBillsSnapshot, bill: OfficeBill) {
  return { ...snapshot, bills: snapshot.bills.map((item) =>
    item.id === bill.id ? bill : item) };
}

export function useOfficeBills(input: {
  accessToken: string;
  disableOnline?: boolean;
  initialSnapshot?: OfficeBillsSnapshot;
  store: OfflineStore;
  syncStatus: string;
}) {
  const [snapshot, setSnapshot] = useState<OfficeBillsSnapshot | null>(
    input.initialSnapshot ?? null,
  );
  const [online, setOnline] = useState(
    () => input.disableOnline ? false : navigator.onLine,
  );
  const [loading, setLoading] = useState(!input.initialSnapshot);
  const [busy, setBusy] = useState(false);
  const [loadingBillId, setLoadingBillId] = useState("");
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
    if (input.disableOnline) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const cached = await cachedSnapshot(input.store);
    if (version !== requestVersion.current) return;
    if (cached) setSnapshot(cached);
    if (!online) {
      setMessage(cached
        ? "Encrypted offline copy — connect to update Office bills."
        : "Connect once to save Office bills on this device.");
      setLoading(false);
      return;
    }
    try {
      const remote = await loadMobileOfficeBills(input.accessToken);
      if (version !== requestVersion.current) return;
      await cacheSnapshot(input.store, remote);
      setSnapshot(remote);
      setMessage(null);
    } catch (reason) {
      if (version !== requestVersion.current) return;
      setMessage(cached
        ? "Could not refresh. Showing the encrypted Office copy."
        : reason instanceof Error ? reason.message : "Office bills could not be loaded.");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [input.accessToken, input.disableOnline, input.store, online]);

  useEffect(() => {
    void refresh();
    return () => { requestVersion.current += 1; };
  }, [refresh, input.syncStatus]);

  const loadBill = useCallback(async (billId: string) => {
    const summary = snapshot?.bills.find((bill) => bill.id === billId);
    if (!summary) return null;
    if (summary.contentComplete) return summary;
    setLoadingBillId(billId); setMessage(null);
    try {
      const local = await cachedBill(input.store, billId);
      if (local?.bill.updatedAt === summary.updatedAt) {
        setSnapshot((current) => current ? withBill(current, local.bill) : current);
        return local.bill;
      }
      if (input.disableOnline || !online) {
        setMessage("Connect once to save this bill's full details on your device."); return null;
      }
      const detail = await loadMobileOfficeBillDetail(input.accessToken, billId);
      if (detail.bill.id !== billId || detail.bill.updatedAt !== summary.updatedAt) {
        await refresh(); setMessage("This bill changed, so Office has been refreshed."); return null;
      }
      setSnapshot((current) => current ? withBill(current, detail.bill) : current);
      await cacheBill(input.store, detail); return detail.bill;
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "The full bill could not be opened.");
      return null;
    } finally { setLoadingBillId(""); }
  }, [input.accessToken, input.disableOnline, input.store, online, refresh, snapshot]);

  const mutate = useCallback(async (mutation: OfficeBillDraftMutation) => {
    if (!online || !snapshot) {
      setMessage("Connect to change Office bills.");
      return false;
    }
    setBusy(true);
    setMessage(null);
    try {
      const next = await mutateMobileOfficeBill(input.accessToken, mutation, snapshot.revision);
      await cacheSnapshot(input.store, next);
      setSnapshot(next);
      setMessage("Office bill saved securely.");
      return true;
    } catch (reason) {
      if (reason instanceof OfficeBillsConflictError) {
        await cacheSnapshot(input.store, reason.snapshot);
        setSnapshot(reason.snapshot);
      }
      setMessage(reason instanceof Error ? reason.message : "The bill could not be saved.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [input.accessToken, input.store, online, snapshot]);

  return { busy, loadBill, loading, loadingBillId, message, mutate, online, refresh, snapshot };
}
