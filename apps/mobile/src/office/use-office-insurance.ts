import { useCallback, useEffect, useRef, useState } from "react";

import type { JsonObject } from "@diarydock/contracts";
import {
  OFFICE_INSURANCE_DETAIL_SCHEMA_VERSION,
  OFFICE_INSURANCE_SCHEMA_VERSION,
  parseOfficeInsuranceDetail,
  parseOfficeInsuranceSnapshot,
  type OfficeInsuranceClaim,
  type OfficeInsuranceDetail,
  type OfficeInsurancePolicy,
  type OfficeInsuranceSnapshot,
} from "@diarydock/office";
import { type OfflineStore, tryGetReadModel, tryPutReadModel,
  tryRemoveReadModel } from "@diarydock/offline-store";

import { readModelCacheKey } from "@mobile/data/offline/read-model-cache-key";
import {
  loadMobileOfficeInsuranceDetail,
  loadMobileOfficeInsurance,
  mutateMobileOfficeInsurance,
  OfficeInsuranceConflictError,
  type OfficeInsuranceDraftMutation,
} from "./insurance-client";

const CACHE_KEY = "office-insurance";

async function cacheSnapshot(store: OfflineStore, snapshot: OfficeInsuranceSnapshot) {
  await tryPutReadModel(store,
    CACHE_KEY,
    OFFICE_INSURANCE_SCHEMA_VERSION,
    snapshot as unknown as JsonObject,
  );
}

async function cachedSnapshot(store: OfflineStore) {
  const cached = await tryGetReadModel(store, CACHE_KEY);
  if (!cached) return null;
  if (cached.schemaVersion !== OFFICE_INSURANCE_SCHEMA_VERSION) {
    await tryRemoveReadModel(store, CACHE_KEY);
    return null;
  }
  try {
    return parseOfficeInsuranceSnapshot(cached.payload);
  } catch {
    await tryRemoveReadModel(store, CACHE_KEY);
    return null;
  }
}

function detailIdentity(detail: OfficeInsuranceDetail) {
  return detail.resourceType === "POLICY" ? detail.policy.id : detail.claim.id;
}

async function detailCacheKey(resourceType: "POLICY" | "CLAIM", resourceId: string) {
  return readModelCacheKey(`office-${resourceType.toLowerCase()}`, resourceId);
}

async function cacheDetail(store: OfflineStore, detail: OfficeInsuranceDetail) {
  try {
    await tryPutReadModel(store, await detailCacheKey(detail.resourceType, detailIdentity(detail)),
      OFFICE_INSURANCE_DETAIL_SCHEMA_VERSION, detail as unknown as JsonObject);
  } catch { /* Best effort; the owner-scoped server record remains authoritative. */ }
}

async function cachedDetail(store: OfflineStore, resourceType: "POLICY" | "CLAIM",
  resourceId: string) {
  const key = await detailCacheKey(resourceType, resourceId);
  try {
    const value = await tryGetReadModel(store, key);
    if (!value) return null;
    if (value.schemaVersion !== OFFICE_INSURANCE_DETAIL_SCHEMA_VERSION) {
      await tryRemoveReadModel(store, key); return null;
    }
    const detail = parseOfficeInsuranceDetail(value.payload);
    if (detail.resourceType !== resourceType || detailIdentity(detail) !== resourceId) {
      await tryRemoveReadModel(store, key); return null;
    }
    return detail;
  } catch { await tryRemoveReadModel(store, key); return null; }
}

function withPolicy(snapshot: OfficeInsuranceSnapshot, policy: OfficeInsurancePolicy) {
  return { ...snapshot, policies: snapshot.policies.map((item) =>
    item.id === policy.id ? policy : item) };
}

function withClaim(snapshot: OfficeInsuranceSnapshot, claim: OfficeInsuranceClaim) {
  return { ...snapshot, claims: snapshot.claims.map((item) =>
    item.id === claim.id ? claim : item) };
}

export function useOfficeInsurance(input: {
  accessToken: string;
  disableOnline?: boolean;
  initialInsuranceSnapshot?: OfficeInsuranceSnapshot;
  store: OfflineStore;
  syncStatus: string;
}) {
  const [snapshot, setSnapshot] = useState<OfficeInsuranceSnapshot | null>(
    input.initialInsuranceSnapshot ?? null,
  );
  const [online, setOnline] = useState(
    () => input.disableOnline ? false : navigator.onLine,
  );
  const [loading, setLoading] = useState(!input.initialInsuranceSnapshot);
  const [busy, setBusy] = useState(false);
  const [loadingPolicyId, setLoadingPolicyId] = useState("");
  const [loadingClaimId, setLoadingClaimId] = useState("");
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
        ? "Encrypted offline copy — connect to update insurance."
        : "Connect once to save insurance on this device.");
      setLoading(false);
      return;
    }
    try {
      const remote = await loadMobileOfficeInsurance(input.accessToken);
      if (version !== requestVersion.current) return;
      await cacheSnapshot(input.store, remote);
      setSnapshot(remote);
      setMessage(null);
    } catch (reason) {
      if (version !== requestVersion.current) return;
      setMessage(cached
        ? "Could not refresh. Showing the encrypted insurance copy."
        : reason instanceof Error ? reason.message : "Insurance could not be loaded.");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [input.accessToken, input.disableOnline, input.store, online]);

  useEffect(() => {
    void refresh();
    return () => { requestVersion.current += 1; };
  }, [refresh, input.syncStatus]);

  const loadPolicy = useCallback(async (policyId: string) => {
    const summary = snapshot?.policies.find((item) => item.id === policyId);
    if (!summary) return null;
    if (summary.contentComplete) return summary;
    setLoadingPolicyId(policyId); setMessage(null);
    try {
      const local = await cachedDetail(input.store, "POLICY", policyId);
      if (local?.resourceType === "POLICY" && local.policy.updatedAt === summary.updatedAt) {
        setSnapshot((current) => current ? withPolicy(current, local.policy) : current);
        return local.policy;
      }
      if (input.disableOnline || !online) {
        setMessage("Connect once to save this policy's full details on your device."); return null;
      }
      const detail = await loadMobileOfficeInsuranceDetail(input.accessToken, "POLICY", policyId);
      if (detail.resourceType !== "POLICY" || detail.policy.updatedAt !== summary.updatedAt) {
        await refresh(); setMessage("This policy changed, so Office has been refreshed."); return null;
      }
      setSnapshot((current) => current ? withPolicy(current, detail.policy) : current);
      await cacheDetail(input.store, detail); return detail.policy;
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "The full policy could not be opened.");
      return null;
    } finally { setLoadingPolicyId(""); }
  }, [input.accessToken, input.disableOnline, input.store, online, refresh, snapshot]);

  const loadClaim = useCallback(async (claimId: string) => {
    const summary = snapshot?.claims.find((item) => item.id === claimId);
    if (!summary) return null;
    if (summary.contentComplete) return summary;
    setLoadingClaimId(claimId); setMessage(null);
    try {
      const local = await cachedDetail(input.store, "CLAIM", claimId);
      if (local?.resourceType === "CLAIM" && local.claim.updatedAt === summary.updatedAt) {
        setSnapshot((current) => current ? withClaim(current, local.claim) : current);
        return local.claim;
      }
      if (input.disableOnline || !online) {
        setMessage("Connect once to save this claim's full details on your device."); return null;
      }
      const detail = await loadMobileOfficeInsuranceDetail(input.accessToken, "CLAIM", claimId);
      if (detail.resourceType !== "CLAIM" || detail.claim.updatedAt !== summary.updatedAt) {
        await refresh(); setMessage("This claim changed, so Office has been refreshed."); return null;
      }
      setSnapshot((current) => current ? withClaim(current, detail.claim) : current);
      await cacheDetail(input.store, detail); return detail.claim;
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "The full claim could not be opened.");
      return null;
    } finally { setLoadingClaimId(""); }
  }, [input.accessToken, input.disableOnline, input.store, online, refresh, snapshot]);

  const mutate = useCallback(async (mutation: OfficeInsuranceDraftMutation) => {
    if (!online || !snapshot) {
      setMessage("Connect to change Office insurance.");
      return false;
    }
    setBusy(true);
    setMessage(null);
    try {
      const next = await mutateMobileOfficeInsurance(
        input.accessToken,
        mutation,
        snapshot.revision,
      );
      await cacheSnapshot(input.store, next);
      setSnapshot(next);
      setMessage("Office insurance saved securely.");
      return true;
    } catch (reason) {
      if (reason instanceof OfficeInsuranceConflictError) {
        await cacheSnapshot(input.store, reason.snapshot);
        setSnapshot(reason.snapshot);
      }
      setMessage(reason instanceof Error ? reason.message : "Insurance could not be saved.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [input.accessToken, input.store, online, snapshot]);

  return { busy, loadClaim, loadPolicy, loading, loadingClaimId, loadingPolicyId,
    message, mutate, online, refresh, snapshot };
}
