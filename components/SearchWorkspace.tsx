"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { UiIcon, type IconName } from "@/components/UiIcon";
import { searchCategories, searchDateFilters, type SearchCategory, type SearchDateFilter, type SearchResult } from "@/lib/search/results";

const commonSearches = ["passport", "insurance", "MOT", "will", "GP", "emergency", "school", "pet"];
const categoryLabels: Record<SearchCategory, string> = { all: "Everything", documents: "Documents", reminders: "Reminders", home: "Home", vehicles: "Vehicles", pets: "Pets", travel: "Travel", insurance: "Insurance", contacts: "Contacts", assets: "Smart items" };
const dateLabels: Record<SearchDateFilter, string> = { all: "Any date", "30": "Next 30 days", "90": "Next 90 days", expired: "Date passed" };
const categoryIcons: Record<Exclude<SearchCategory, "all">, IconName> = { documents: "file", reminders: "calendar", home: "home", vehicles: "car", pets: "leaf", travel: "map-pin", insurance: "shield", contacts: "users", assets: "gear" };
const categoryTones: Record<Exclude<SearchCategory, "all">, string> = { documents: "bg-mist text-sky-700", reminders: "bg-[#f5ecd8] text-[#80652c]", home: "bg-sage/60 text-moss", vehicles: "bg-slate-100 text-slate-600", pets: "bg-[#e8efe5] text-[#52705a]", travel: "bg-[#e8edf3] text-[#526d80]", insurance: "bg-[#f1e9d6] text-[#80652c]", contacts: "bg-[#eee9f3] text-[#665674]", assets: "bg-[#e8efe5] text-[#52705a]" };

export function SearchWorkspace() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SearchCategory>("all");
  const [dateFilter, setDateFilter] = useState<SearchDateFilter>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    try { setRecent(JSON.parse(sessionStorage.getItem("diarydock-recent-searches") || "[]").filter((value: unknown): value is string => typeof value === "string").slice(0, 5)); }
    catch { setRecent([]); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ q: query, category, date: dateFilter });
      setLoading(true); setError("");
      void fetch(`/api/search?${params}`, { cache: "no-store", signal: controller.signal })
        .then(async (response) => { const payload = await response.json() as { results?: SearchResult[]; error?: string }; if (!response.ok) throw new Error(payload.error || "Search could not be completed."); setResults(payload.results ?? []); })
        .catch((caught) => { if (caught instanceof DOMException && caught.name === "AbortError") return; setError(caught instanceof Error ? caught.message : "Search could not be completed."); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, category, dateFilter]);

  const remember = (term: string) => {
    const clean = term.trim(); if (clean.length < 2) return;
    const next = [clean, ...recent.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 5);
    setRecent(next);
    try { sessionStorage.setItem("diarydock-recent-searches", JSON.stringify(next)); } catch { /* Session-only history is optional. */ }
  };

  const grouped = useMemo(() => {
    const map = new Map<Exclude<SearchCategory, "all">, SearchResult[]>();
    results.forEach((result) => map.set(result.category, [...(map.get(result.category) ?? []), result]));
    return [...map.entries()];
  }, [results]);

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Private search" title="Find anything" subtitle="Search only records your signed-in account is allowed to open. Full OCR, private notes and phone numbers are not searched." backHref="/dashboard" backLabel="Home" action={<Link href="/ask" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#315443] px-3.5 text-xs font-semibold text-white"><UiIcon name="star" className="h-4 w-4" /><span className="hidden sm:inline">Ask DiaryDock</span></Link>} meta={<><span className="estate-chip">Permission checked first</span><span className="estate-chip">No AI required</span></>} />

      <section className="estate-sheet sticky top-3 z-20 p-3">
        <label className="flex items-center gap-3 rounded-[22px] bg-white/80 px-4 py-3 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.35)]">
          <UiIcon name="search" className="h-5 w-5 shrink-0 text-ink/35" />
          <input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") remember(query); }} placeholder="Search passport, insurance, MOT..." className="w-full bg-transparent text-[16px] text-ink outline-none placeholder:text-ink/38" />
          {query ? <button type="button" onClick={() => setQuery("")} className="rounded-full bg-mist px-3 py-1.5 text-xs font-semibold text-ink/55">Clear</button> : null}
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:flex">
          <label className="sr-only" htmlFor="search-category">Category</label><select id="search-category" value={category} onChange={(event) => setCategory(event.target.value as SearchCategory)} className="min-h-10 rounded-xl border border-ink/10 bg-white/75 px-3 text-xs font-semibold text-ink/65">{searchCategories.map((value) => <option key={value} value={value}>{categoryLabels[value]}</option>)}</select>
          <label className="sr-only" htmlFor="search-date">Date</label><select id="search-date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value as SearchDateFilter)} className="min-h-10 rounded-xl border border-ink/10 bg-white/75 px-3 text-xs font-semibold text-ink/65">{searchDateFilters.map((value) => <option key={value} value={value}>{dateLabels[value]}</option>)}</select>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{[...recent, ...commonSearches.filter((term) => !recent.some((item) => item.toLowerCase() === term.toLowerCase()))].slice(0, 10).map((term) => <button key={term} type="button" onClick={() => { setQuery(term); remember(term); }} className="shrink-0 rounded-full border border-white/70 bg-white/62 px-3 py-1.5 text-xs font-semibold text-ink/55">{recent.includes(term) ? `Recent: ${term}` : term}</button>)}</div>
      </section>

      <div className="flex items-center justify-between gap-3 px-1"><p className="text-sm font-semibold text-ink">{loading ? "Searching safely…" : `${results.length} result${results.length === 1 ? "" : "s"}`}</p><p className="text-right text-xs text-ink/45">Filtered before ranking</p></div>
      {error ? <p role="alert" className="rounded-2xl bg-[#fbe5df] px-4 py-3 text-sm text-[#a4473d]">{error}</p> : null}

      {!loading && grouped.length ? <div className="space-y-5">{grouped.map(([groupCategory, groupResults]) => <section key={groupCategory} className="space-y-3"><SectionHeader title={categoryLabels[groupCategory]} hint={`${groupResults.length} authorised ${groupResults.length === 1 ? "result" : "results"}`} /><div className="estate-sheet divide-y divide-white/60 overflow-hidden">{groupResults.map((result) => <Link key={result.id} href={result.href} onClick={() => remember(query)} className="flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-white/55"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${categoryTones[groupCategory]}`}><UiIcon name={categoryIcons[groupCategory]} className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="truncate text-sm font-semibold text-ink">{result.title}</span>{result.badge ? <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold capitalize text-ink/52">{result.badge}</span> : null}</span><span className="mt-0.5 block truncate text-xs text-ink/50">{[result.detail, result.dueAt ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(result.dueAt)) : ""].filter(Boolean).join(" · ")}</span></span><UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-ink/25" /></Link>)}</div></section>)}</div> : null}
      {!loading && !error && !results.length ? <EmptyState icon="search" title="No authorised results" message="Try a title, issuer, room, vehicle, trip, provider or another date filter." /> : null}
    </div>
  );
}
