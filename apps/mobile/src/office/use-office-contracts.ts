import { useCallback, useEffect, useRef, useState } from "react";

import type { JsonObject } from "@diarydock/contracts";
import {
  OFFICE_CONTRACT_DETAIL_SCHEMA_VERSION,
  OFFICE_CONTRACTS_SCHEMA_VERSION,
  parseOfficeContractDetail,
  parseOfficeContractsSnapshot,
  type OfficeContract,
  type OfficeContractDetail,
  type OfficeContractsSnapshot,
} from "@diarydock/office";
import { type OfflineStore, tryGetReadModel, tryPutReadModel,
  tryRemoveReadModel } from "@diarydock/offline-store";

import { readModelCacheKey } from "@mobile/data/offline/read-model-cache-key";
import {
  loadMobileOfficeContractDetail,
  loadMobileOfficeContracts,
  mutateMobileOfficeContract,
  OfficeContractsConflictError,
  type OfficeContractDraftMutation,
} from "./contracts-client";

const CACHE_KEY = "office-contracts";

async function cacheSnapshot(store: OfflineStore, snapshot: OfficeContractsSnapshot) {
  await tryPutReadModel(store, CACHE_KEY, OFFICE_CONTRACTS_SCHEMA_VERSION,
    snapshot as unknown as JsonObject);
}

async function cachedSnapshot(store: OfflineStore) {
  const cached = await tryGetReadModel(store, CACHE_KEY);
  if (!cached) return null;
  if (cached.schemaVersion !== OFFICE_CONTRACTS_SCHEMA_VERSION) {
    await tryRemoveReadModel(store, CACHE_KEY);
    return null;
  }
  try {
    return parseOfficeContractsSnapshot(cached.payload);
  } catch {
    await tryRemoveReadModel(store, CACHE_KEY);
    return null;
  }
}

async function contractCacheKey(contractId: string) {
  return readModelCacheKey("office-contract", contractId);
}
async function cacheContract(store: OfflineStore, detail: OfficeContractDetail) {
  try { await tryPutReadModel(store, await contractCacheKey(detail.contract.id),
    OFFICE_CONTRACT_DETAIL_SCHEMA_VERSION, detail as unknown as JsonObject); }
  catch { /* Best effort; the owner-scoped server record remains authoritative. */ }
}
async function cachedContract(store: OfflineStore, contractId: string) {
  const key = await contractCacheKey(contractId);
  try { const value = await tryGetReadModel(store, key);
    if (!value) return null;
    if (value.schemaVersion !== OFFICE_CONTRACT_DETAIL_SCHEMA_VERSION) {
      await tryRemoveReadModel(store, key); return null;
    }
    const detail = parseOfficeContractDetail(value.payload);
    if (detail.contract.id !== contractId) { await tryRemoveReadModel(store, key); return null; }
    return detail;
  } catch { await tryRemoveReadModel(store, key); return null; }
}
function withContract(snapshot: OfficeContractsSnapshot, contract: OfficeContract) {
  return { ...snapshot, contracts: snapshot.contracts.map((item) =>
    item.id === contract.id ? contract : item) };
}

export function useOfficeContracts(input: {
  accessToken: string;
  disableOnline?: boolean;
  initialContractsSnapshot?: OfficeContractsSnapshot;
  store: OfflineStore;
  syncStatus: string;
}) {
  const [snapshot, setSnapshot] = useState<OfficeContractsSnapshot | null>(
    input.initialContractsSnapshot ?? null,
  );
  const [online, setOnline] = useState(() => input.disableOnline ? false : navigator.onLine);
  const [loading, setLoading] = useState(!input.initialContractsSnapshot);
  const [busy, setBusy] = useState(false);
  const [loadingContractId, setLoadingContractId] = useState("");
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
      setMessage(cached ? "Encrypted offline copy — connect to update contracts."
        : "Connect once to save Office contracts on this device.");
      setLoading(false);
      return;
    }
    try {
      const remote = await loadMobileOfficeContracts(input.accessToken);
      if (version !== requestVersion.current) return;
      await cacheSnapshot(input.store, remote);
      if (version !== requestVersion.current) return;
      setSnapshot(remote);
      setMessage(null);
    } catch (reason) {
      if (version !== requestVersion.current) return;
      setMessage(cached ? "Could not refresh. Showing the encrypted Office copy."
        : reason instanceof Error ? reason.message : "Office contracts could not be loaded.");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [input.accessToken, input.disableOnline, input.store, online]);

  useEffect(() => {
    void refresh();
    return () => { requestVersion.current += 1; };
  }, [refresh, input.syncStatus]);

  const loadContract = useCallback(async (contractId: string) => {
    const summary = snapshot?.contracts.find((contract) => contract.id === contractId);
    if (!summary) return null;
    if (summary.contentComplete) return summary;
    setLoadingContractId(contractId); setMessage(null);
    try { const local = await cachedContract(input.store, contractId);
      if (local?.contract.updatedAt === summary.updatedAt) {
        setSnapshot((current) => current ? withContract(current, local.contract) : current);
        return local.contract;
      }
      if (input.disableOnline || !online) {
        setMessage("Connect once to save this contract's full details on your device."); return null;
      }
      const detail = await loadMobileOfficeContractDetail(input.accessToken, contractId);
      if (detail.contract.id !== contractId || detail.contract.updatedAt !== summary.updatedAt) {
        await refresh(); setMessage("This contract changed, so Office has been refreshed.");
        return null;
      }
      setSnapshot((current) => current ? withContract(current, detail.contract) : current);
      await cacheContract(input.store, detail); return detail.contract;
    } catch (reason) { setMessage(reason instanceof Error ? reason.message
      : "The full contract could not be opened."); return null;
    } finally { setLoadingContractId(""); }
  }, [input.accessToken, input.disableOnline, input.store, online, refresh, snapshot]);

  const mutate = useCallback(async (mutation: OfficeContractDraftMutation) => {
    if (!online || !snapshot) { setMessage("Connect to change Office contracts."); return false; }
    setBusy(true);
    setMessage(null);
    try {
      const next = await mutateMobileOfficeContract(input.accessToken, mutation, snapshot.revision);
      await cacheSnapshot(input.store, next);
      setSnapshot(next);
      setMessage("Office contract saved securely.");
      return true;
    } catch (reason) {
      if (reason instanceof OfficeContractsConflictError) {
        await cacheSnapshot(input.store, reason.snapshot);
        setSnapshot(reason.snapshot);
      }
      setMessage(reason instanceof Error ? reason.message : "The contract could not be saved.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [input.accessToken, input.store, online, snapshot]);

  return { busy, loadContract, loading, loadingContractId, message, mutate, online, refresh, snapshot };
}
