"use client";

import { useMemo, useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { tripDestination, type TripType } from "@/lib/trip-records";

import type { TripFilter } from "./trips-model";

export function useTripsDirectory(createOnLoad: boolean) {
  const { state, hydrated } = useDiaryDockData();
  const [createOpen, setCreateOpen] = useState(createOnLoad);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TripFilter>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | TripType>("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const today = new Date().toISOString().slice(0, 10);
  const visibleTrips = useMemo(() => state.trips.trips.filter(trip => {
    const haystack = `${trip.title} ${tripDestination(trip)} ${trip.travellerRecords.map(person => person.displayName).join(" ")} ${trip.bookings.map(booking => `${booking.provider} ${booking.title}`).join(" ")} ${trip.notes}`.toLowerCase();
    const matchesSearch = haystack.includes(query.trim().toLowerCase());
    const isPast = Boolean(trip.endDate && trip.endDate < today) || trip.status === "completed" || trip.status === "cancelled";
    const matchesFilter = filter === "all"
      || (filter === "upcoming" && !isPast && trip.status !== "draft" && trip.status !== "archived")
      || (filter === "past" && isPast)
      || (filter === "draft" && trip.status === "draft")
      || (filter === "shared" && trip.shares.some(share => share.status === "accepted"));
    return matchesSearch
      && matchesFilter
      && (typeFilter === "all" || trip.tripType === typeFilter)
      && (countryFilter === "all" || trip.destinationCountry === countryFilter)
      && (yearFilter === "all" || trip.startDate.startsWith(yearFilter));
  }), [countryFilter, filter, query, state.trips.trips, today, typeFilter, yearFilter]);
  const groups = useMemo(() => ({
    happening: visibleTrips.filter(trip => trip.status === "happening" || (
      trip.startDate <= today && trip.endDate >= today
      && trip.status !== "cancelled" && trip.status !== "archived"
    )),
    upcoming: visibleTrips.filter(trip => trip.startDate > today && ![
      "draft", "archived", "cancelled", "completed"
    ].includes(trip.status)),
    drafts: visibleTrips.filter(trip => trip.status === "draft"),
    past: visibleTrips.filter(trip => Boolean(trip.endDate && trip.endDate < today)
      || trip.status === "completed" || trip.status === "cancelled"),
    archived: visibleTrips.filter(trip => trip.status === "archived")
  }), [today, visibleTrips]);
  const countries = Array.from(new Set(state.trips.trips.map(trip => trip.destinationCountry).filter(Boolean))).sort();
  const years = Array.from(new Set(state.trips.trips.map(trip => trip.startDate.slice(0, 4)).filter(Boolean))).sort().reverse();
  const nextTrip = [...state.trips.trips]
    .filter(trip => trip.startDate >= today && !["draft", "archived", "cancelled", "completed"].includes(trip.status))
    .sort((left, right) => left.startDate.localeCompare(right.startDate))[0];
  const tripsThisYear = state.trips.trips.filter(trip => trip.startDate.startsWith(today.slice(0, 4))).length;
  const checklistRemaining = state.travelChecklist.items.filter(item =>
    !item.completed && state.trips.trips.some(trip => trip.id === item.tripId && trip.status !== "archived")
  ).length;
  const travelReminders = state.reminders.filter(reminder =>
    state.trips.trips.some(trip => trip.reminderIds.includes(reminder.id)) && reminder.group !== "done"
  ).length;
  const documentsToReview = state.trips.trips.flatMap(trip => trip.documentLinks).filter(link =>
    state.vaultDocuments.find(document => document.id === link.documentId)?.reviewStatus === "needs-review"
  ).length;
  return {
    state,
    hydrated,
    createOpen,
    setCreateOpen,
    query,
    setQuery,
    filter,
    setFilter,
    typeFilter,
    setTypeFilter,
    countryFilter,
    setCountryFilter,
    yearFilter,
    setYearFilter,
    visibleTrips,
    groups,
    countries,
    years,
    nextTrip,
    tripsThisYear,
    checklistRemaining,
    travelReminders,
    documentsToReview
  };
}

export type TripsDirectoryController = ReturnType<typeof useTripsDirectory>;
