import { useMemo, useState } from "react";

import type { TravelSnapshot, TravelTrip } from "@diarydock/travel";

import { daysUntil, tripDateRange, tripDestination, tripStatus } from "./travel-format";

export function TripDirectory({ online, snapshot, onCreate, onOpen }: {
  online: boolean;
  snapshot: TravelSnapshot;
  onCreate: () => void;
  onOpen: (trip: TravelTrip) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("active");
  const today = new Date().toISOString().slice(0, 10);
  const visible = useMemo(() => snapshot.trips.filter((trip) => {
    const matches = `${trip.title} ${tripDestination(trip)}`.toLowerCase().includes(query.toLowerCase());
    if (!matches) return false;
    if (filter === "past") return Boolean(trip.endDate && trip.endDate < today);
    if (filter === "draft") return trip.status === "draft";
    if (filter === "archived") return trip.status === "archived";
    if (filter === "active") return !["completed", "cancelled", "archived"].includes(trip.status)
      && (!trip.endDate || trip.endDate >= today);
    return true;
  }), [filter, query, snapshot.trips, today]);
  const next = [...snapshot.trips].filter((trip) => trip.startDate >= today
    && !["cancelled", "archived"].includes(trip.status)).sort((a, b) =>
    a.startDate.localeCompare(b.startDate))[0];

  return <>
    <section className="travel-next">
      <div><p>Next journey</p><h2>{next?.title ?? "Your next adventure starts here"}</h2>
        <span>{next ? `${tripDestination(next)} · ${tripDateRange(next)}`
          : "Create a trip when you are ready to begin planning."}</span></div>
      {next && daysUntil(next.startDate) !== null ? <b>{daysUntil(next.startDate)} days</b> : null}
    </section>
    <section className="travel-filters">
      <input type="search" aria-label="Search trips" placeholder="Search trips"
        value={query} onChange={(event) => setQuery(event.target.value)} />
      <select aria-label="Trip filter" value={filter} onChange={(event) => setFilter(event.target.value)}>
        <option value="active">Upcoming</option><option value="all">All trips</option>
        <option value="past">Past</option><option value="draft">Drafts</option>
        <option value="archived">Archived</option>
      </select>
      <button type="button" disabled={!online} onClick={onCreate}>＋ New trip</button>
    </section>
    <section className="travel-directory" aria-label="Trips">
      <header><div><p>My trips</p><h2>{filter === "all" ? "Every journey" : "Travel plans"}</h2></div>
        <span>{visible.length}</span></header>
      {visible.length ? visible.map((trip) => {
        const checklist = snapshot.checklist.filter((item) => item.tripId === trip.id);
        const complete = checklist.filter((item) => item.completed).length;
        return <button type="button" className="travel-card" key={trip.id} onClick={() => onOpen(trip)}>
          <div className="travel-card-title"><span>{trip.tripType}</span><b>{tripStatus(trip.status)}</b></div>
          <h3>{trip.title}</h3><p>{tripDestination(trip)}</p><small>{tripDateRange(trip)}</small>
          <div className="travel-card-facts"><span><b>{trip.travellers.length
            || (trip.travellerSummary ? 1 : 0)}</b> travellers</span>
            <span><b>{checklist.length ? Math.round(complete / checklist.length * 100) : 0}%</b> checklist</span>
            <span><b>{trip.bookings.length}</b> bookings</span></div>
        </button>;
      }) : <div className="travel-empty"><strong>No trips here yet</strong>
        <span>Create a journey or adjust the search and filter.</span></div>}
    </section>
  </>;
}
