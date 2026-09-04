import { useCallback, useEffect, useRef, useState } from "react";

import {
  ATTIC_SCHEMA_VERSION,
  parseAtticSnapshot,
  type AtticSnapshot,
} from "@diarydock/attic";
import type { JsonObject } from "@diarydock/contracts";
import { type OfflineStore, tryGetReadModel, tryPutReadModel,
  tryRemoveReadModel } from "@diarydock/offline-store";

import {
  AtticConflictError,
  loadMobileAttic,
  mutateMobileAttic,
  type AtticDraftMutation,
} from "./attic-client";

const CACHE_KEY = "attic-records";

function pageCacheKey(page: number) {
  return page === 1 ? CACHE_KEY : `attic-records-page-${page}`;
}

async function cacheSnapshot(
  store: OfflineStore,
  snapshot: AtticSnapshot,
  page = 1,
) {
  await tryPutReadModel(store,
    pageCacheKey(page),
    ATTIC_SCHEMA_VERSION,
    snapshot as unknown as JsonObject,
  );
}

async function cachedSnapshot(store: OfflineStore) {
  const cached = await tryGetReadModel(store, CACHE_KEY);
  if (!cached) return null;
  if (cached.schemaVersion !== ATTIC_SCHEMA_VERSION) {
    await tryRemoveReadModel(store, CACHE_KEY);
    return null;
  }
  try {
    return parseAtticSnapshot(cached.payload);
  } catch {
    await tryRemoveReadModel(store, CACHE_KEY);
    return null;
  }
}

async function cachedPage(store: OfflineStore, page: number) {
  const cached = await tryGetReadModel(store, pageCacheKey(page));
  if (!cached || cached.schemaVersion !== ATTIC_SCHEMA_VERSION) return null;
  try {
    return parseAtticSnapshot(cached.payload);
  } catch {
    await tryRemoveReadModel(store, pageCacheKey(page));
    return null;
  }
}

function mergePage(current: AtticSnapshot, page: AtticSnapshot): AtticSnapshot {
  const ids = new Set(current.stories.map((story) => story.id));
  return {
    ...current,
    totalStoryCount: page.totalStoryCount,
    nextCursor: page.nextCursor,
    stories: [
      ...current.stories,
      ...page.stories.filter((story) => !ids.has(story.id)),
    ],
  };
}

export function useAttic(input: {
  accessToken: string;
  disableOnline?: boolean;
  initialSnapshot?: AtticSnapshot;
  store: OfflineStore;
  syncStatus: string;
}) {
  const [snapshot, setSnapshot] = useState<AtticSnapshot | null>(
    input.initialSnapshot ?? null,
  );
  const [online, setOnline] = useState(
    () => !input.disableOnline && navigator.onLine,
  );
  const [loading, setLoading] = useState(!input.initialSnapshot);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pageCount, setPageCount] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const requestVersion = useRef(0);

  useEffect(() => {
    const connected = () => setOnline(!input.disableOnline);
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
    setLoading(true);
    const cached = input.initialSnapshot ?? (await cachedSnapshot(input.store));
    if (version !== requestVersion.current) return;
    if (cached) setSnapshot(cached);
    if (input.disableOnline || !online) {
      setMessage(
        input.disableOnline
          ? null
          : cached
            ? "Encrypted offline copy — connect to add a family story."
            : "Connect once to save the Attic on this device.",
      );
      setLoading(false);
      return;
    }
    try {
      const remote = await loadMobileAttic(input.accessToken);
      if (version !== requestVersion.current) return;
      await cacheSnapshot(input.store, remote);
      setSnapshot(remote);
      setPageCount(1);
      setMessage(null);
    } catch (reason) {
      if (version !== requestVersion.current) return;
      setMessage(
        cached
          ? "Could not refresh. Showing the encrypted Attic copy saved on this device."
          : reason instanceof Error
            ? reason.message
            : "The Attic could not be loaded.",
      );
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [input.accessToken, input.disableOnline, input.initialSnapshot, input.store, online]);

  useEffect(() => {
    void refresh();
    return () => {
      requestVersion.current += 1;
    };
  }, [refresh, input.syncStatus]);

  const loadMore = useCallback(async () => {
    const cursor = snapshot?.nextCursor;
    if (!cursor || loadingMore) return false;
    const nextPageNumber = pageCount + 1;
    setLoadingMore(true);
    setMessage(null);
    const cached = await cachedPage(input.store, nextPageNumber);
    const usableCache =
      cached?.revision === snapshot.revision && cached.cursor === cursor
        ? cached
        : null;
    if (input.disableOnline || !online) {
      if (usableCache) {
        setSnapshot((current) => current ? mergePage(current, usableCache) : current);
        setPageCount(nextPageNumber);
        setMessage("Older stories opened from this device's encrypted copy.");
      } else {
        setMessage("Connect to load this part of the family archive once.");
      }
      setLoadingMore(false);
      return Boolean(usableCache);
    }
    try {
      const page = await loadMobileAttic(input.accessToken, cursor);
      if (page.cursor !== cursor || page.revision !== snapshot.revision) {
        await refresh();
        setMessage("The Attic changed, so the newest archive has been reopened.");
        return false;
      }
      await cacheSnapshot(input.store, page, nextPageNumber);
      setSnapshot((current) => current ? mergePage(current, page) : current);
      setPageCount(nextPageNumber);
      return true;
    } catch (reason) {
      if (usableCache) {
        setSnapshot((current) => current ? mergePage(current, usableCache) : current);
        setPageCount(nextPageNumber);
        setMessage("Could not refresh. Older stories were opened from the encrypted copy.");
        return true;
      }
      setMessage(reason instanceof Error ? reason.message : "Older stories could not be loaded.");
      return false;
    } finally {
      setLoadingMore(false);
    }
  }, [input.accessToken, input.disableOnline, input.store, loadingMore, online, pageCount, refresh, snapshot]);

  const mutate = useCallback(async (mutation: AtticDraftMutation) => {
    if (!online || input.disableOnline || !snapshot) {
      setMessage("Connect to add a family story.");
      return false;
    }
    setBusy(true);
    setMessage(null);
    try {
      const next = await mutateMobileAttic(
        input.accessToken,
        mutation,
        snapshot.revision,
      );
      await cacheSnapshot(input.store, next);
      setSnapshot(next);
      setPageCount(1);
      setMessage("Family story saved securely.");
      return true;
    } catch (reason) {
      if (reason instanceof AtticConflictError) {
        await cacheSnapshot(input.store, reason.snapshot);
        setSnapshot(reason.snapshot);
      }
      setMessage(reason instanceof Error ? reason.message : "The story could not be saved.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [input.accessToken, input.disableOnline, input.store, online, snapshot]);

  return {
    busy,
    loadMore,
    loading,
    loadingMore,
    message,
    mutate,
    online,
    refresh,
    snapshot,
  };
}
