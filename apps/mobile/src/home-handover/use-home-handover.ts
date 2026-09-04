import { useCallback, useEffect, useRef, useState } from "react";

import type { JsonObject } from "@diarydock/contracts";
import {
  HOME_HANDOVER_DETAIL_SCHEMA_VERSION,
  HOME_HANDOVER_SCHEMA_VERSION,
  homeHandoverDetailKey,
  homeHandoverOwnerCache,
  parseHomeHandoverDetail,
  parseHomeHandoverSnapshot,
  type HandoverCandidate,
  type HomeHandoverDetail,
  type HomeHandoverDetailRequest,
  type HomeHandoverSnapshot,
} from "@diarydock/home-handover";
import { type OfflineStore, tryGetReadModel, tryPutReadModel,
  tryRemoveReadModel } from "@diarydock/offline-store";

import { readModelCacheKey } from "@mobile/data/offline/read-model-cache-key";
import { HomeHandoverConflictError, loadMobileHomeHandover,
  loadMobileHomeHandoverDetail,
  updateMobileHomeHandover } from "./home-handover-client";

const CACHE_KEY = "home-handover";
async function cache(store: OfflineStore, snapshot: HomeHandoverSnapshot) {
  const ownerOnly = homeHandoverOwnerCache(snapshot);
  await tryPutReadModel(store, CACHE_KEY, HOME_HANDOVER_SCHEMA_VERSION,
    ownerOnly as unknown as JsonObject);
}
async function cached(store: OfflineStore) {
  const value = await tryGetReadModel(store, CACHE_KEY);
  if (!value) return null;
  if (value.schemaVersion !== HOME_HANDOVER_SCHEMA_VERSION) {
    await tryRemoveReadModel(store, CACHE_KEY); return null;
  }
  try { return parseHomeHandoverSnapshot(value.payload); }
  catch { await tryRemoveReadModel(store, CACHE_KEY); return null; }
}

async function detailCacheKey(request: HomeHandoverDetailRequest) {
  return readModelCacheKey("handover-detail", homeHandoverDetailKey(request));
}
async function cacheDetail(store: OfflineStore, detail: HomeHandoverDetail) {
  if (detail.scope !== "OWNER") return;
  try { await tryPutReadModel(store, await detailCacheKey(detail),
    HOME_HANDOVER_DETAIL_SCHEMA_VERSION, detail as unknown as JsonObject); }
  catch { /* Detail caching is best effort; the owner-checked server copy remains authoritative. */ }
}
async function cachedDetail(store: OfflineStore, request: HomeHandoverDetailRequest) {
  if (request.scope !== "OWNER") return null;
  try { const value = await tryGetReadModel(store, await detailCacheKey(request));
    if (!value || value.schemaVersion !== HOME_HANDOVER_DETAIL_SCHEMA_VERSION) return null;
    const detail = parseHomeHandoverDetail(value.payload);
    return homeHandoverDetailKey(detail) === homeHandoverDetailKey(request) ? detail : null;
  } catch { return null; }
}

export function useHomeHandover(input: { accessToken: string; disableOnline?: boolean;
  initialSnapshot?: HomeHandoverSnapshot; store: OfflineStore; syncStatus: string }) {
  const [snapshot, setSnapshot] = useState<HomeHandoverSnapshot | null>(input.initialSnapshot ?? null);
  const [online, setOnline] = useState(() => !input.disableOnline && navigator.onLine);
  const [loading, setLoading] = useState(!input.initialSnapshot);
  const [busyKey, setBusyKey] = useState("");
  const [details, setDetails] = useState<Record<string, HomeHandoverDetail>>({});
  const [loadingDetailKey, setLoadingDetailKey] = useState("");
  const [message, setMessage] = useState<string | null>(null);
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
      ? "Encrypted offline copy — connect and sign in recently to make changes."
      : "Connect once to keep Home Handover available offline."); setLoading(false); return; }
    try { const remote = await loadMobileHomeHandover(input.accessToken);
      if (current !== version.current) return; await cache(input.store, remote);
      setSnapshot(remote); setMessage(null); }
    catch (error) { if (current === version.current) setMessage(local
      ? "Could not refresh. Showing your encrypted Home Handover copy."
      : error instanceof Error ? error.message : "Home Handover could not be opened."); }
    finally { if (current === version.current) setLoading(false); }
  }, [input.accessToken, input.disableOnline, input.initialSnapshot, input.store, online]);

  useEffect(() => { void refresh(); return () => { version.current += 1; }; },
    [refresh, input.syncStatus]);

  const loadDetail = useCallback(async (request: HomeHandoverDetailRequest) => {
    const key = homeHandoverDetailKey(request); setLoadingDetailKey(key); setMessage(null);
    const local = await cachedDetail(input.store, request);
    if (local) setDetails((current) => ({ ...current, [key]: local }));
    if (!online || input.disableOnline) {
      if (!local) setMessage(request.scope === "RECEIVED"
        ? "Received handover details require a live access check. Connect to open this item."
        : "Connect once to save this full handover detail on your device.");
      setLoadingDetailKey(""); return local;
    }
    try { const remote = await loadMobileHomeHandoverDetail(input.accessToken, request);
      if (homeHandoverDetailKey(remote) !== key) throw new Error("Home Handover detail did not match.");
      setDetails((current) => ({ ...current, [key]: remote }));
      await cacheDetail(input.store, remote); return remote;
    } catch (error) { setMessage(local
      ? "Could not refresh this detail. Showing the encrypted offline copy."
      : error instanceof Error ? error.message : "The full handover detail could not be opened.");
      return local;
    } finally { setLoadingDetailKey(""); }
  }, [input.accessToken, input.disableOnline, input.store, online]);

  const mutate = useCallback(async (key: string, mutation: Parameters<typeof updateMobileHomeHandover>[1]) => {
    if (!online || input.disableOnline) { setMessage("Connect to change Home Handover."); return; }
    setBusyKey(key); setMessage(null);
    try { const next = await updateMobileHomeHandover(input.accessToken, mutation);
      await cache(input.store, next); setSnapshot(next);
      setMessage(mutation.operation === "CREATE_PACK" ? "Your private draft is ready."
        : mutation.operation === "SET_ITEM" ? mutation.selected
          ? "Item added to the private preview." : "Item removed from the private preview."
          : mutation.operation === "PUBLISH"
            ? "A read-only copy is available to that verified email for 30 days."
            : "Recipient access has been revoked."); }
    catch (error) { if (error instanceof HomeHandoverConflictError) {
      await cache(input.store, error.snapshot); setSnapshot(error.snapshot); }
      setMessage(error instanceof Error ? error.message : "Home Handover could not be updated."); }
    finally { setBusyKey(""); }
  }, [input.accessToken, input.disableOnline, input.store, online]);

  const createDraft = useCallback((name: string) => mutate("create", { operation: "CREATE_PACK", name }),
    [mutate]);
  const toggleItem = useCallback((candidate: HandoverCandidate) => {
    if (!snapshot?.draft) return Promise.resolve();
    const key = `${candidate.resourceType}:${candidate.resourceId}`;
    return mutate(key, { operation: "SET_ITEM", revision: snapshot.draft.revision,
      packId: snapshot.draft.id, resourceType: candidate.resourceType,
      resourceId: candidate.resourceId, selected: !candidate.selected });
  }, [mutate, snapshot]);

  const publish = useCallback((recipientEmail: string) => {
    if (!snapshot?.draft) return Promise.resolve();
    return mutate("publish", { operation: "PUBLISH", revision: snapshot.draft.revision,
      packId: snapshot.draft.id, recipientEmail });
  }, [mutate, snapshot]);
  const revoke = useCallback(() => {
    if (!snapshot?.publication) return Promise.resolve();
    return mutate("revoke", { operation: "REVOKE", publicationId: snapshot.publication.id,
      publicationRevision: snapshot.publication.revision });
  }, [mutate, snapshot]);

  return { busyKey, createDraft, detailFor: (request: HomeHandoverDetailRequest) =>
    details[homeHandoverDetailKey(request)] ?? null,
  detailLoading: (request: HomeHandoverDetailRequest) =>
    loadingDetailKey === homeHandoverDetailKey(request),
  loadDetail, loading, message, online, publish, revoke, snapshot, toggleItem };
}
