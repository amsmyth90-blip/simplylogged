import { useEffect, useMemo, useState } from "react";

import type { OfflineStore } from "@diarydock/offline-store";
import {
  filterAndRankSearchResults,
  type SearchCandidate,
  type SearchCategory,
  type SearchDateFilter,
  type SearchResult,
} from "@diarydock/search";

import { loadLocalSearchCandidates } from "./local-candidates";
import { searchDiaryDock } from "./search-client";

export function useSearchResults(input: {
  accessToken: string;
  category: SearchCategory;
  date: SearchDateFilter;
  disableOnline?: boolean;
  query: string;
  store: OfflineStore;
  syncStatus: string;
}) {
  const [local, setLocal] = useState<SearchCandidate[]>([]);
  const [remote, setRemote] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [onlineError, setOnlineError] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const connected = () => setOnline(true);
    const disconnected = () => setOnline(false);
    window.addEventListener("online", connected);
    window.addEventListener("offline", disconnected);
    return () => {
      window.removeEventListener("online", connected);
      window.removeEventListener("offline", disconnected);
    };
  }, []);

  useEffect(() => {
    let active = true;
    void loadLocalSearchCandidates(input.store).then((items) => {
      if (active) setLocal(items);
    }).catch(() => {
      if (active) setLocal([]);
    });
    return () => { active = false; };
  }, [input.store, input.syncStatus]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    if (input.disableOnline || !online) {
      setRemote([]);
      setOnlineError(!input.disableOnline);
      setLoading(false);
      return () => { active = false; controller.abort(); };
    }
    setLoading(true);
    const timer = window.setTimeout(() => {
      void searchDiaryDock({
        accessToken: input.accessToken,
        category: input.category,
        date: input.date,
        query: input.query,
        signal: controller.signal,
      }).then((result) => {
        if (active) {
          setRemote(result.results);
          setOnlineError(false);
        }
      }).catch((error: unknown) => {
        if (active && !(error instanceof DOMException && error.name === "AbortError")) {
          setRemote([]);
          setOnlineError(true);
        }
      }).finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [input.accessToken, input.category, input.date, input.disableOnline, input.query, online]);

  const localResults = useMemo(() => filterAndRankSearchResults(
    local,
    input.query,
    input.category,
    input.date,
  ).slice(0, 50), [input.category, input.date, input.query, local]);
  const results = useMemo(() => {
    if (!remote.length) return localResults;
    const ids = new Set(remote.map((item) => item.id));
    return [...remote, ...localResults.filter((item) => !ids.has(item.id))].slice(0, 50);
  }, [localResults, remote]);
  return { loading, onlineError, results };
}
