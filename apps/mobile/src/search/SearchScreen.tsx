import { useEffect, useState } from "react";

import { Browser } from "@capacitor/browser";
import { DocumentService, type DocumentSummary } from "@diarydock/documents";
import type { OfflineStore } from "@diarydock/offline-store";
import {
  searchCategories,
  searchDateFilters,
  type SearchCategory,
  type SearchDateFilter,
  type SearchResult,
} from "@diarydock/search";

import { BrandMark } from "@mobile/components/BrandMark";
import type { MobileDestination } from "@mobile/components/MobileBottomNav";
import { DocumentViewer } from "@mobile/files/DocumentViewer";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

import { AskPanel } from "./AskPanel";
import { loadRecentSearches, rememberSearch } from "./recent-searches";
import { SearchResults } from "./SearchResults";
import { useSearchResults } from "./use-search-results";

type SearchScreenProps = {
  accessToken: string;
  disableOnline?: boolean;
  store: OfflineStore;
  syncStatus: string;
  onBack: () => void;
  onNavigate: (destination: MobileDestination) => void;
};

const categoryLabels: Record<SearchCategory, string> = {
  all: "Everything", assets: "Items", contacts: "Contacts", documents: "Files",
  home: "Home", insurance: "Insurance", pets: "Pets", reminders: "Reminders",
  travel: "Travel", vehicles: "Vehicles",
};

export function SearchScreen(props: SearchScreenProps) {
  const [mode, setMode] = useState<"ASK" | "SEARCH">("SEARCH");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SearchCategory>("all");
  const [date, setDate] = useState<SearchDateFilter>("all");
  const [recent, setRecent] = useState<string[]>([]);
  const [viewer, setViewer] = useState<DocumentSummary | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const search = useSearchResults({ ...props, category, date, query });

  useEffect(() => {
    void loadRecentSearches(props.store).then(setRecent).catch(() => setRecent([]));
  }, [props.store]);

  async function remember() {
    try { setRecent(await rememberSearch(props.store, recent, query)); } catch { /* Search still works. */ }
  }

  async function open(result: SearchResult) {
    setOpenError(null);
    await remember();
    if (result.category === "documents") {
      const documentId = result.id.startsWith("document:") ? result.id.slice(9) : "";
      const documents = await new DocumentService(props.store).list();
      const document = documents.find((item) => item.id === documentId);
      if (document) { setViewer(document); return; }
    }
    if (result.category === "reminders") {
      props.onNavigate("REMINDERS");
      return;
    }
    if (!navigator.onLine || props.disableOnline) {
      setOpenError("Connect to open this record. Your offline files and reminders remain available.");
      return;
    }
    const url = new URL(result.href, getSecureRuntime().apiOrigin);
    await Browser.open({ url: url.toString(), presentationStyle: "popover" });
  }

  return (
    <main className="search-screen">
      <header className="search-header">
        <button type="button" className="search-back" onClick={props.onBack} aria-label="Back">‹</button>
        <div className="search-brand"><BrandMark /><span><strong>Find anything</strong><small>DiaryDock</small></span></div>
        <span className="search-security">Encrypted</span>
      </header>
      <section className="search-hero">
        <p className="eyebrow">Your secure index</p><h1>What do you need?</h1>
        <div className="search-modes" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "SEARCH"} onClick={() => setMode("SEARCH")}>Search</button>
          <button type="button" role="tab" aria-selected={mode === "ASK"} onClick={() => setMode("ASK")}>✦ Ask DiaryDock</button>
        </div>
      </section>
      {mode === "ASK" ? <AskPanel accessToken={props.accessToken} disabled={props.disableOnline} onOpen={(result) => void open(result)} /> : (
        <>
          <section className="search-controls">
            <label><span>Search DiaryDock</span><input autoFocus value={query} maxLength={80} onChange={(event) => setQuery(event.target.value)} placeholder="Policy, passport, boiler…" /></label>
            {recent.length && !query ? <div className="recent-searches">{recent.map((item) => <button type="button" key={item} onClick={() => setQuery(item)}>↺ {item}</button>)}</div> : null}
            <div className="search-filter-row">
              <select aria-label="Category" value={category} onChange={(event) => setCategory(event.target.value as SearchCategory)}>{searchCategories.map((item) => <option key={item} value={item}>{categoryLabels[item]}</option>)}</select>
              <select aria-label="Date" value={date} onChange={(event) => setDate(event.target.value as SearchDateFilter)}>{searchDateFilters.map((item) => <option key={item} value={item}>{item === "all" ? "Any date" : item === "expired" ? "Expired" : `Next ${item} days`}</option>)}</select>
            </div>
          </section>
          {search.onlineError ? <p className="offline-search-note">Offline results from this encrypted device</p> : null}
          {openError ? <p className="form-message form-error" role="alert">{openError}</p> : null}
          <SearchResults loading={search.loading} results={search.results} onOpen={(result) => void open(result)} />
        </>
      )}
      {viewer ? <DocumentViewer accessToken={props.accessToken} document={viewer} store={props.store} onClose={() => setViewer(null)} /> : null}
    </main>
  );
}
