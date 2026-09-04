import { useCallback, useEffect, useRef, useState } from "react";

import type { JsonObject } from "@diarydock/contracts";
import {
  KITCHEN_PLANNING_SCHEMA_VERSION,
  parseKitchenPlanningSnapshot,
  parseKitchenRecipeDetail,
  type KitchenPlanningSnapshot,
  type KitchenRecipe,
  type KitchenRecipeDetail,
} from "@diarydock/kitchen";
import { type OfflineStore, tryGetReadModel, tryPutReadModel,
  tryRemoveReadModel } from "@diarydock/offline-store";

import { readModelCacheKey } from "@mobile/data/offline/read-model-cache-key";
import {
  KitchenPlanningConflictError,
  loadMobileKitchenPlanning,
  loadMobileKitchenRecipe,
  mutateMobileKitchenPlanning,
  type KitchenPlanningDraftMutation,
} from "./planning-client";

const CACHE_KEY = "kitchen-planning";

async function cache(store: OfflineStore, snapshot: KitchenPlanningSnapshot) {
  await tryPutReadModel(store, CACHE_KEY, KITCHEN_PLANNING_SCHEMA_VERSION,
    snapshot as unknown as JsonObject);
}

async function cached(store: OfflineStore) {
  const value = await tryGetReadModel(store, CACHE_KEY);
  if (!value) return null;
  if (value.schemaVersion !== KITCHEN_PLANNING_SCHEMA_VERSION) {
    await tryRemoveReadModel(store, CACHE_KEY);
    return null;
  }
  try { return parseKitchenPlanningSnapshot(value.payload); }
  catch { await tryRemoveReadModel(store, CACHE_KEY); return null; }
}

async function cacheRecipe(store: OfflineStore, detail: KitchenRecipeDetail) {
  try {
    await tryPutReadModel(
      store,
      await readModelCacheKey("kitchen-recipe", detail.recipe.id),
      KITCHEN_PLANNING_SCHEMA_VERSION,
      detail as unknown as JsonObject,
    );
  } catch {
    // Full recipe caching is best effort; the server copy remains authoritative.
  }
}

async function cachedRecipe(store: OfflineStore, recipeId: string) {
  try {
    const key = await readModelCacheKey("kitchen-recipe", recipeId);
    const value = await tryGetReadModel(store, key);
    if (!value || value.schemaVersion !== KITCHEN_PLANNING_SCHEMA_VERSION) {
      return null;
    }
    return parseKitchenRecipeDetail(value.payload);
  } catch {
    return null;
  }
}

function withRecipe(snapshot: KitchenPlanningSnapshot, recipe: KitchenRecipe) {
  return {
    ...snapshot,
    recipes: snapshot.recipes.map((candidate) =>
      candidate.id === recipe.id
        ? { ...recipe, favourite: candidate.favourite }
        : candidate,
    ),
  };
}

export function useKitchenPlanning(input: {
  accessToken: string;
  disableOnline?: boolean;
  initialSnapshot?: KitchenPlanningSnapshot;
  store: OfflineStore;
  syncStatus: string;
}) {
  const [snapshot, setSnapshot] = useState<KitchenPlanningSnapshot | null>(input.initialSnapshot ?? null);
  const [online, setOnline] = useState(() => input.disableOnline ? false : navigator.onLine);
  const [loading, setLoading] = useState(!input.initialSnapshot);
  const [busy, setBusy] = useState(false);
  const [loadingRecipeId, setLoadingRecipeId] = useState<string | null>(null);
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
    const local = input.initialSnapshot ?? await cached(input.store);
    if (current !== version.current) return;
    if (local) setSnapshot(local);
    if (input.disableOnline || !online) {
      setMessage(local ? "Encrypted offline copy — connect to change Kitchen planning."
        : "Connect once to keep recipes and meal plans available offline.");
      setLoading(false); return;
    }
    try {
      const remote = await loadMobileKitchenPlanning(input.accessToken);
      if (current !== version.current) return;
      await cache(input.store, remote); setSnapshot(remote); setMessage(null);
    } catch (reason) {
      if (current === version.current) setMessage(local
        ? "Could not refresh. Showing the encrypted Kitchen planning copy."
        : reason instanceof Error ? reason.message : "Kitchen planning could not be loaded.");
    } finally { if (current === version.current) setLoading(false); }
  }, [input.accessToken, input.disableOnline, input.initialSnapshot, input.store, online]);

  useEffect(() => { void refresh(); return () => { version.current += 1; }; },
    [refresh, input.syncStatus]);

  const loadRecipe = useCallback(async (recipeId: string) => {
    const summary = snapshot?.recipes.find((recipe) => recipe.id === recipeId);
    if (!summary) return null;
    if (summary.contentComplete) return summary;
    setLoadingRecipeId(recipeId);
    setMessage(null);
    try {
      const local = await cachedRecipe(input.store, recipeId);
      if (local?.recipe.version === summary.version) {
        setSnapshot((current) => current ? withRecipe(current, local.recipe) : current);
        return local.recipe;
      }
      if (input.disableOnline || !online) {
        setMessage("Connect once to save the full recipe on this device.");
        return null;
      }
      const detail = await loadMobileKitchenRecipe(input.accessToken, recipeId);
      if (detail.recipe.id !== recipeId || detail.recipe.version !== summary.version) {
        await refresh();
        setMessage("This recipe changed, so Kitchen planning has been refreshed.");
        return null;
      }
      await cacheRecipe(input.store, detail);
      setSnapshot((current) => current ? withRecipe(current, detail.recipe) : current);
      return detail.recipe;
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "The full recipe could not be opened.");
      return null;
    } finally {
      setLoadingRecipeId(null);
    }
  }, [input.accessToken, input.disableOnline, input.store, online, refresh, snapshot]);

  const mutate = useCallback(async (mutation: KitchenPlanningDraftMutation) => {
    if (!online || input.disableOnline || !snapshot) {
      setMessage("Connect to change Kitchen planning."); return null;
    }
    setBusy(true); setMessage(null);
    try {
      const result = await mutateMobileKitchenPlanning(input.accessToken, mutation, snapshot.revision);
      await cache(input.store, result.snapshot); setSnapshot(result.snapshot);
      setMessage(result.addedCount
        ? `${result.addedCount} item${result.addedCount === 1 ? "" : "s"} added to shopping.`
        : "Kitchen planning updated securely.");
      return result;
    } catch (reason) {
      if (reason instanceof KitchenPlanningConflictError) {
        await cache(input.store, reason.snapshot); setSnapshot(reason.snapshot);
      }
      setMessage(reason instanceof Error ? reason.message : "Kitchen planning could not be updated.");
      return null;
    } finally { setBusy(false); }
  }, [input.accessToken, input.disableOnline, input.store, online, snapshot]);

  return {
    busy,
    loading,
    loadingRecipeId,
    loadRecipe,
    message,
    mutate,
    online,
    refresh,
    snapshot,
  };
}
