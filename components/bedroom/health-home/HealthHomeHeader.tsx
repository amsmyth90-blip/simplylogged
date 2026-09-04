import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";

import type { BedroomHealthViewModel } from "./useBedroomHealth";

export function HealthHomeHeader({ view }: { view: BedroomHealthViewModel }) {
  return (
    <header className="overflow-hidden rounded-[30px] border border-white/80 bg-[#fffdf8]/92 p-5 shadow-[0_25px_60px_-42px_rgba(32,53,42,0.6)] sm:p-7">
      <div className="flex items-start gap-3">
        <Link
          href="/room/bedroom"
          aria-label="Back to Bedroom"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#20352a]/10 bg-white"
        >
          <UiIcon name="arrow-left" className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6f8e72]">
            Bedroom
          </p>
          <h1 className="mt-1 font-serif text-4xl tracking-tight">My Health</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667068]">
            Keep your health records, appointments and important medical
            information organised in one private place.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => view.setSearchOpen((value) => !value)}
            aria-label="Search Bedroom health records"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#20352a]/10 bg-white"
          >
            <UiIcon name="search" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => view.setAddOpen(true)}
            aria-label="Add health information"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#315443] text-white"
          >
            <UiIcon name="plus" className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-2 rounded-2xl bg-[#eef2e9] px-3 py-2 text-[11px] text-[#48604e]">
        <UiIcon name="lock" className="h-4 w-4" />
        <span>
          Private to your account unless you explicitly share a supported
          record.
        </span>
      </div>
      {view.searchOpen ? <HealthSearch view={view} /> : null}
    </header>
  );
}

function HealthSearch({ view }: { view: BedroomHealthViewModel }) {
  return (
    <div className="mt-4">
      <label className="relative block">
        <span className="sr-only">Search health records</span>
        <UiIcon
          name="search"
          className="absolute left-3 top-3.5 h-4 w-4 text-[#667068]"
        />
        <input
          autoFocus
          value={view.query}
          onChange={(event) => view.setQuery(event.target.value)}
          placeholder="Search your health records"
          className="min-h-11 w-full rounded-2xl border border-[#20352a]/10 bg-white pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#6f8e72]"
        />
      </label>
      {view.query.trim() ? (
        <div className="mt-2 max-h-72 space-y-1 overflow-y-auto rounded-2xl border border-[#20352a]/10 bg-white p-2">
          {view.searchResults.length ? (
            view.searchResults.map((item) => (
              <Link
                key={`${item.href}-${item.title}`}
                href={item.href}
                className="flex min-h-12 items-center gap-3 rounded-xl px-3 hover:bg-[#f5f4ed]"
              >
                <UiIcon name={item.icon} className="h-4 w-4 text-[#52705a]" />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold">
                    {item.title}
                  </span>
                  <span className="block truncate text-[10px] text-[#667068]">
                    {item.detail}
                  </span>
                </span>
              </Link>
            ))
          ) : (
            <p className="p-3 text-xs text-[#667068]">
              No authorised Bedroom records match that search.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
