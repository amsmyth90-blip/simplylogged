import { useCallback, useEffect, useRef, useState } from "react";

import type { JsonObject } from "@diarydock/contracts";
import {
  PHYSICAL_ASSET_DETAIL_SCHEMA_VERSION,
  PHYSICAL_LINKS_SCHEMA_VERSION,
  parsePhysicalAssetDetail,
  parsePhysicalLinksSnapshot,
  type PhysicalAsset,
  type PhysicalAssetDetail,
  type PhysicalLinksSnapshot,
} from "@diarydock/physical-links";
import { type OfflineStore, tryGetReadModel, tryPutReadModel,
  tryRemoveReadModel } from "@diarydock/offline-store";
import { readModelCacheKey } from "@mobile/data/offline/read-model-cache-key";
import {
  loadMobilePhysicalAsset,
  loadMobilePhysicalLinks,
  mutateMobilePhysicalLinks,
  PhysicalLinksConflictError,
  type PhysicalLinksDraftMutation,
} from "./physical-links-client";

const CACHE_KEY = "physical-links";

async function cache(store: OfflineStore, snapshot: PhysicalLinksSnapshot) {
  await tryPutReadModel(store, CACHE_KEY, PHYSICAL_LINKS_SCHEMA_VERSION,
    snapshot as unknown as JsonObject);
}

async function cached(store: OfflineStore) {
  const value = await tryGetReadModel(store, CACHE_KEY);
  if (!value) return null;
  if (value.schemaVersion !== PHYSICAL_LINKS_SCHEMA_VERSION) {
    await tryRemoveReadModel(store, CACHE_KEY); return null;
  }
  try { return parsePhysicalLinksSnapshot(value.payload); }
  catch { await tryRemoveReadModel(store, CACHE_KEY); return null; }
}

async function assetCacheKey(assetId: string) {
  return readModelCacheKey("physical-asset", assetId);
}
async function cacheAsset(store: OfflineStore, detail: PhysicalAssetDetail) {
  try { await tryPutReadModel(store, await assetCacheKey(detail.asset.id),
    PHYSICAL_ASSET_DETAIL_SCHEMA_VERSION, detail as unknown as JsonObject); }
  catch { /* Best effort; the owner-scoped server record remains authoritative. */ }
}
async function cachedAsset(store: OfflineStore, assetId: string) {
  const key = await assetCacheKey(assetId);
  try { const value = await tryGetReadModel(store, key);
    if (!value) return null;
    if (value.schemaVersion !== PHYSICAL_ASSET_DETAIL_SCHEMA_VERSION) {
      await tryRemoveReadModel(store, key); return null;
    }
    const detail = parsePhysicalAssetDetail(value.payload);
    if (detail.asset.id !== assetId) { await tryRemoveReadModel(store, key); return null; }
    return detail;
  } catch { await tryRemoveReadModel(store, key); return null; }
}
function withAsset(snapshot: PhysicalLinksSnapshot, asset: PhysicalAsset) {
  return { ...snapshot, assets: snapshot.assets.map((item) => item.id === asset.id ? asset : item) };
}

export function usePhysicalLinks(input: { accessToken: string; disableOnline?: boolean;
  initialSnapshot?: PhysicalLinksSnapshot; store: OfflineStore; syncStatus: string }) {
  const [snapshot, setSnapshot] = useState<PhysicalLinksSnapshot | null>(input.initialSnapshot ?? null);
  const [online, setOnline] = useState(() => !input.disableOnline && navigator.onLine);
  const [loading, setLoading] = useState(!input.initialSnapshot);
  const [busy, setBusy] = useState(false);
  const [detailedAssetIds, setDetailedAssetIds] = useState<Set<string>>(() => new Set());
  const [loadingAssetId, setLoadingAssetId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const version = useRef(0);

  useEffect(() => {
    if (input.disableOnline) return;
    const connected = () => setOnline(true); const disconnected = () => setOnline(false);
    window.addEventListener("online", connected); window.addEventListener("offline", disconnected);
    return () => { window.removeEventListener("online", connected);
      window.removeEventListener("offline", disconnected); };
  }, [input.disableOnline]);

  const refresh = useCallback(async () => {
    const current = ++version.current; setLoading(true);
    const local = input.initialSnapshot ?? await cached(input.store);
    if (current !== version.current) return;
    if (local) { setSnapshot(local); setDetailedAssetIds(new Set()); }
    if (input.disableOnline || !online) {
      setMessage(local ? "Encrypted offline copy — connect to manage tags."
        : "Connect once to keep Physical Links available offline."); setLoading(false); return;
    }
    try { const remote = await loadMobilePhysicalLinks(input.accessToken);
      if (current !== version.current) return;
      await cache(input.store, remote); setSnapshot(remote); setDetailedAssetIds(new Set());
      setMessage(null); }
    catch (error) { if (current === version.current) setMessage(local
      ? "Could not refresh. Showing the encrypted Physical Links copy."
      : error instanceof Error ? error.message : "Physical Links could not be opened."); }
    finally { if (current === version.current) setLoading(false); }
  }, [input.accessToken, input.disableOnline, input.initialSnapshot, input.store, online]);

  useEffect(() => { void refresh(); return () => { version.current += 1; }; },
    [refresh, input.syncStatus]);

  const loadAsset = useCallback(async (assetId: string) => {
    const summary = snapshot?.assets.find((asset) => asset.id === assetId);
    if (!summary) return null;
    if (snapshot?.detailsComplete || detailedAssetIds.has(assetId)) return summary;
    setLoadingAssetId(assetId); setMessage(null);
    try { const local = await cachedAsset(input.store, assetId);
      if (local?.asset.updatedAt === summary.updatedAt) {
        setSnapshot((current) => current ? withAsset(current, local.asset) : current);
        setDetailedAssetIds((current) => new Set(current).add(assetId)); return local.asset;
      }
      if (input.disableOnline || !online) {
        setMessage("Connect once to save this item's full details on your device."); return null;
      }
      const detail = await loadMobilePhysicalAsset(input.accessToken, assetId);
      if (detail.asset.id !== assetId || detail.asset.updatedAt !== summary.updatedAt) {
        await refresh(); setMessage("This item changed, so Physical Links has been refreshed.");
        return null;
      }
      setSnapshot((current) => current ? withAsset(current, detail.asset) : current);
      setDetailedAssetIds((current) => new Set(current).add(assetId));
      await cacheAsset(input.store, detail); return detail.asset;
    } catch (error) { setMessage(error instanceof Error ? error.message
      : "The full household item could not be opened."); return null;
    } finally { setLoadingAssetId(""); }
  }, [detailedAssetIds, input.accessToken, input.disableOnline, input.store,
    online, refresh, snapshot]);

  const mutate = useCallback(async (mutation: PhysicalLinksDraftMutation) => {
    if (!online || input.disableOnline || !snapshot) {
      setMessage("Connect to manage Physical Links."); return null;
    }
    setBusy(true); setMessage(null);
    try { const result = await mutateMobilePhysicalLinks(
      input.accessToken, mutation, snapshot.revision);
      await cache(input.store, result.snapshot); setSnapshot(result.snapshot);
      setDetailedAssetIds(new Set());
      setMessage("Physical Links updated securely."); return result; }
    catch (error) { if (error instanceof PhysicalLinksConflictError) {
      await cache(input.store, error.snapshot); setSnapshot(error.snapshot);
      setDetailedAssetIds(new Set()); }
      setMessage(error instanceof Error ? error.message : "Physical Links could not be updated.");
      return null; }
    finally { setBusy(false); }
  }, [input.accessToken, input.disableOnline, input.store, online, snapshot]);

  return { busy, isAssetDetailed: (assetId: string) => Boolean(snapshot?.detailsComplete)
    || detailedAssetIds.has(assetId), loadAsset, loading, loadingAssetId, message, mutate,
  online, refresh, setMessage, snapshot };
}
