"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { SearchControls } from "@/components/search-workspace/SearchControls";
import { SearchResults } from "@/components/search-workspace/SearchResults";
import { UiIcon } from "@/components/UiIcon";
import type {
  SearchCategory,
  SearchDateFilter,
  SearchResult,
} from "@/lib/search/results";

function loadRecentSearches() {
  try {
    const parsed: unknown = JSON.parse(
      sessionStorage.getItem("diarydock-recent-searches") || "[]",
    );
    return Array.isArray(parsed)
      ? parsed
          .filter((value): value is string => typeof value === "string")
          .slice(0, 5)
      : [];
  } catch {
    return [];
  }
}

export function SearchWorkspace() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SearchCategory>("all");
  const [dateFilter, setDateFilter] = useState<SearchDateFilter>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => setRecent(loadRecentSearches()), []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({
        q: query,
        category,
        date: dateFilter,
      });
      setLoading(true);
      setError("");
      void fetch(`/api/search?${params}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = (await response.json()) as {
            results?: SearchResult[];
            error?: string;
          };
          if (!response.ok)
            throw new Error(payload.error || "Search could not be completed.");
          setResults(payload.results ?? []);
        })
        .catch((caught) => {
          if (caught instanceof DOMException && caught.name === "AbortError")
            return;
          setError(
            caught instanceof Error
              ? caught.message
              : "Search could not be completed.",
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, category, dateFilter]);

  function remember(term: string) {
    const clean = term.trim();
    if (clean.length < 2) return;
    const next = [
      clean,
      ...recent.filter((item) => item.toLowerCase() !== clean.toLowerCase()),
    ].slice(0, 5);
    setRecent(next);
    try {
      sessionStorage.setItem("diarydock-recent-searches", JSON.stringify(next));
    } catch {
      // Session-only history is optional.
    }
  }

  const grouped = useMemo(() => {
    const groups = new Map<Exclude<SearchCategory, "all">, SearchResult[]>();
    results.forEach((result) =>
      groups.set(result.category, [
        ...(groups.get(result.category) ?? []),
        result,
      ]),
    );
    return [...groups.entries()];
  }, [results]);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Private search"
        title="Find anything"
        subtitle="Search only records your signed-in account is allowed to open. Full OCR, private notes and phone numbers are not searched."
        backHref="/dashboard"
        backLabel="Home"
        action={
          <Link
            href="/ask"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#315443] px-3.5 text-xs font-semibold text-white"
          >
            <UiIcon name="star" className="h-4 w-4" />
            <span className="hidden sm:inline">Ask DiaryDock</span>
          </Link>
        }
        meta={
          <>
            <span className="estate-chip">Permission checked first</span>
            <span className="estate-chip">No AI required</span>
          </>
        }
      />
      <SearchControls
        category={category}
        dateFilter={dateFilter}
        query={query}
        recent={recent}
        remember={remember}
        setCategory={setCategory}
        setDateFilter={setDateFilter}
        setQuery={setQuery}
      />
      <SearchResults
        error={error}
        grouped={grouped}
        loading={loading}
        query={query}
        remember={remember}
        results={results}
      />
    </div>
  );
}
