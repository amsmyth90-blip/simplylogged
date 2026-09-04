import Link from "next/link";

import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/SectionHeader";
import { UiIcon } from "@/components/UiIcon";
import {
  categoryIcons,
  categoryLabels,
  categoryTones,
} from "@/components/search-workspace/search-display";
import type { SearchCategory, SearchResult } from "@/lib/search/results";

type SearchGroup = [Exclude<SearchCategory, "all">, SearchResult[]];

function resultDetail(result: SearchResult) {
  const date = result.dueAt
    ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
        new Date(result.dueAt),
      )
    : "";
  return [result.detail, date].filter(Boolean).join(" · ");
}

export function SearchResults({
  error,
  grouped,
  loading,
  query,
  remember,
  results,
}: {
  error: string;
  grouped: SearchGroup[];
  loading: boolean;
  query: string;
  remember: (term: string) => void;
  results: SearchResult[];
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-sm font-semibold text-ink">
          {loading
            ? "Searching safely…"
            : `${results.length} result${results.length === 1 ? "" : "s"}`}
        </p>
        <p className="text-right text-xs text-ink/45">
          Filtered before ranking
        </p>
      </div>
      {error ? (
        <p
          role="alert"
          className="rounded-2xl bg-[#fbe5df] px-4 py-3 text-sm text-[#a4473d]"
        >
          {error}
        </p>
      ) : null}
      {!loading && grouped.length ? (
        <div className="space-y-5">
          {grouped.map(([category, categoryResults]) => (
            <section key={category} className="space-y-3">
              <SectionHeader
                title={categoryLabels[category]}
                hint={`${categoryResults.length} authorised ${categoryResults.length === 1 ? "result" : "results"}`}
              />
              <div className="estate-sheet divide-y divide-white/60 overflow-hidden">
                {categoryResults.map((result) => (
                  <Link
                    key={result.id}
                    href={result.href}
                    onClick={() => remember(query)}
                    className="flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-white/55"
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${categoryTones[category]}`}
                    >
                      <UiIcon
                        name={categoryIcons[category]}
                        className="h-5 w-5"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-ink">
                          {result.title}
                        </span>
                        {result.badge ? (
                          <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold capitalize text-ink/52">
                            {result.badge}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink/50">
                        {resultDetail(result)}
                      </span>
                    </span>
                    <UiIcon
                      name="chevron-right"
                      className="h-4 w-4 shrink-0 text-ink/25"
                    />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
      {!loading && !error && !results.length ? (
        <EmptyState
          icon="search"
          title="No authorised results"
          message="Try a title, issuer, room, vehicle, trip, provider or another date filter."
        />
      ) : null}
    </>
  );
}
