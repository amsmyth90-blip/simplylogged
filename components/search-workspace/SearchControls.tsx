import type { Dispatch, SetStateAction } from "react";

import { UiIcon } from "@/components/UiIcon";
import {
  categoryLabels,
  commonSearches,
  dateLabels,
} from "@/components/search-workspace/search-display";
import {
  searchCategories,
  searchDateFilters,
  type SearchCategory,
  type SearchDateFilter,
} from "@/lib/search/results";

type Props = {
  category: SearchCategory;
  dateFilter: SearchDateFilter;
  query: string;
  recent: string[];
  remember: (term: string) => void;
  setCategory: Dispatch<SetStateAction<SearchCategory>>;
  setDateFilter: Dispatch<SetStateAction<SearchDateFilter>>;
  setQuery: Dispatch<SetStateAction<string>>;
};

export function SearchControls(props: Props) {
  const suggestions = [
    ...props.recent,
    ...commonSearches.filter(
      (term) =>
        !props.recent.some((item) => item.toLowerCase() === term.toLowerCase()),
    ),
  ].slice(0, 10);
  return (
    <section className="estate-sheet sticky top-3 z-20 p-3">
      <label className="flex items-center gap-3 rounded-[22px] bg-white/80 px-4 py-3 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.35)]">
        <UiIcon name="search" className="h-5 w-5 shrink-0 text-ink/35" />
        <input
          autoFocus
          type="search"
          value={props.query}
          onChange={(event) => props.setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") props.remember(props.query);
          }}
          placeholder="Search passport, insurance, MOT..."
          className="w-full bg-transparent text-[16px] text-ink outline-none placeholder:text-ink/38"
        />
        {props.query ? (
          <button
            type="button"
            onClick={() => props.setQuery("")}
            className="rounded-full bg-mist px-3 py-1.5 text-xs font-semibold text-ink/55"
          >
            Clear
          </button>
        ) : null}
      </label>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex">
        <label className="sr-only" htmlFor="search-category">
          Category
        </label>
        <select
          id="search-category"
          value={props.category}
          onChange={(event) =>
            props.setCategory(event.target.value as SearchCategory)
          }
          className="min-h-10 rounded-xl border border-ink/10 bg-white/75 px-3 text-xs font-semibold text-ink/65"
        >
          {searchCategories.map((value) => (
            <option key={value} value={value}>
              {categoryLabels[value]}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="search-date">
          Date
        </label>
        <select
          id="search-date"
          value={props.dateFilter}
          onChange={(event) =>
            props.setDateFilter(event.target.value as SearchDateFilter)
          }
          className="min-h-10 rounded-xl border border-ink/10 bg-white/75 px-3 text-xs font-semibold text-ink/65"
        >
          {searchDateFilters.map((value) => (
            <option key={value} value={value}>
              {dateLabels[value]}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {suggestions.map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => {
              props.setQuery(term);
              props.remember(term);
            }}
            className="shrink-0 rounded-full border border-white/70 bg-white/62 px-3 py-1.5 text-xs font-semibold text-ink/55"
          >
            {props.recent.includes(term) ? `Recent: ${term}` : term}
          </button>
        ))}
      </div>
    </section>
  );
}
