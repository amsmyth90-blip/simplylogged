"use client";

import { UiIcon } from "@/components/UiIcon";
import { tripTypes, type TripType } from "@/lib/trip-records";

import type { TripFilter } from "./trips-model";
import type { TripsDirectoryController } from "./useTripsDirectory";

export function TripsFilters({ controller }: { controller: TripsDirectoryController }) {
  const {
    query, setQuery, filter, setFilter, typeFilter, setTypeFilter, countryFilter,
    setCountryFilter, yearFilter, setYearFilter, countries, years
  } = controller;
  return (
    <section className="mt-5 rounded-[22px] border border-[#20352a]/[0.07] bg-white/78 p-3 shadow-sm">
      <label className="relative block">
        <UiIcon name="search" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#667068]" />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search trips, travellers, bookings or notes" className="min-h-11 w-full rounded-[14px] border border-[#20352a]/10 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#6f8e72]" />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {(["all", "upcoming", "past", "draft", "shared"] as TripFilter[]).map(item => (
          <button key={item} type="button" onClick={() => setFilter(item)} className={`min-h-11 rounded-full px-4 text-xs font-semibold capitalize ${filter === item ? "bg-[#2f5140] text-white" : "bg-[#eef2e9] text-[#52705a]"}`}>{item}</button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <select aria-label="Trip type" value={typeFilter} onChange={event => setTypeFilter(event.target.value as "all" | TripType)} className="min-h-11 min-w-0 rounded-xl border border-[#20352a]/10 bg-white px-2 text-[10px]"><option value="all">All trip types</option>{tripTypes.map(type => <option key={type}>{type}</option>)}</select>
        <select aria-label="Country" value={countryFilter} onChange={event => setCountryFilter(event.target.value)} className="min-h-11 min-w-0 rounded-xl border border-[#20352a]/10 bg-white px-2 text-[10px]"><option value="all">All countries</option>{countries.map(country => <option key={country}>{country}</option>)}</select>
        <select aria-label="Year" value={yearFilter} onChange={event => setYearFilter(event.target.value)} className="min-h-11 min-w-0 rounded-xl border border-[#20352a]/10 bg-white px-2 text-[10px]"><option value="all">All years</option>{years.map(year => <option key={year}>{year}</option>)}</select>
      </div>
    </section>
  );
}
