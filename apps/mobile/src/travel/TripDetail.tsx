import { useState } from "react";

import type { DocumentSummary } from "@diarydock/documents";
import type { TravelChecklistItem, TravelPolicyOption, TravelTrip } from "@diarydock/travel";

import type { MobileDestination } from "@mobile/components/MobileBottomNav";
import { TripBookings } from "./TripBookings";
import { TripActions } from "./TripActions";
import { TripChecklist } from "./TripChecklist";
import { TripDocuments } from "./TripDocuments";
import { TripEmergency } from "./TripEmergency";
import { TripExpenses } from "./TripExpenses";
import { TripItinerary } from "./TripItinerary";
import { TripTravellers } from "./TripTravellers";
import type { TravelDraftMutation } from "./travel-client";
import { tripDateRange, tripDestination, tripNights, tripStatus } from "./travel-format";

type Tab = "overview" | "itinerary" | "bookings" | "checklist" | "travellers"
  | "expenses" | "documents" | "emergency";
const tabs: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" }, { id: "itinerary", label: "Itinerary" },
  { id: "bookings", label: "Bookings" }, { id: "checklist", label: "Checklist" },
  { id: "travellers", label: "Travellers" }, { id: "expenses", label: "Expenses" },
  { id: "documents", label: "Documents" }, { id: "emergency", label: "Emergency" },
];

function readiness(trip: TravelTrip, checklist: TravelChecklistItem[]) {
  const ready = [Boolean(trip.transport), Boolean(trip.accommodation),
    trip.documentLinks.length > 0, Boolean(trip.linkedInsurancePolicyId),
    checklist.length > 0 && checklist.every((item) => item.completed),
    trip.travellers.length > 0 || Boolean(trip.travellerSummary),
    Boolean(trip.emergencyInfo.destinationEmergencyNumber || trip.emergencyInfo.localContact), false];
  return Math.round(ready.filter(Boolean).length / ready.length * 100);
}

export function TripDetail({ busy, checklist, documents, mutate, online, onBack, onEdit,
  onNavigate, onScan, policies, trip }: {
  busy: boolean;
  checklist: TravelChecklistItem[];
  documents: DocumentSummary[];
  mutate: (mutation: TravelDraftMutation) => Promise<boolean>;
  online: boolean;
  onBack: () => void;
  onEdit: () => void;
  onNavigate: (destination: MobileDestination) => void;
  onScan: () => void;
  policies: TravelPolicyOption[];
  trip: TravelTrip;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const complete = checklist.filter((item) => item.completed).length;
  return <>
    <header className="travel-detail-header">
      <button type="button" onClick={onBack} aria-label="Back to My Trips">‹</button>
      <div><p>{trip.tripType}</p><h1>{trip.title}</h1>
        <span>{tripDestination(trip)} · {tripDateRange(trip)} · {tripNights(trip)} nights</span></div>
      <b>{tripStatus(trip.status)}</b>
      <section><span><strong>{readiness(trip, checklist)}%</strong> readiness</span>
        <span><strong>{trip.travellers.length || (trip.travellerSummary ? 1 : 0)}</strong> travellers</span>
        <span><strong>{trip.bookings.length}</strong> bookings</span></section>
    </header>
    <nav className="travel-detail-tabs" aria-label="Trip sections">{tabs.map((item) =>
      <button type="button" key={item.id} className={tab === item.id ? "active" : ""}
        onClick={() => setTab(item.id)}>{item.label}{item.id === "checklist"
          ? ` · ${complete}/${checklist.length}` : ""}</button>)}</nav>
    {tab === "checklist" ? <TripChecklist busy={busy} items={checklist} mutate={mutate}
      online={online} tripId={trip.id} />
      : tab === "travellers" ? <TripTravellers busy={busy} mutate={mutate} online={online}
        records={trip.travellers} summary={trip.travellerSummary} tripId={trip.id} />
      : tab === "bookings" ? <TripBookings busy={busy} currency={trip.currency} mutate={mutate}
        online={online} records={trip.bookings} timezone={trip.destinationTimezone}
        travellers={trip.travellers} tripId={trip.id} />
      : tab === "itinerary" ? <TripItinerary busy={busy} currency={trip.currency} mutate={mutate}
        online={online} records={trip.itinerary} timezone={trip.destinationTimezone}
        travellers={trip.travellers} tripId={trip.id} />
      : tab === "expenses" ? <TripExpenses busy={busy} currency={trip.currency} mutate={mutate}
        online={online} records={trip.expenses} travellers={trip.travellers} tripId={trip.id} />
      : tab === "emergency" ? <TripEmergency busy={busy} mutate={mutate} online={online}
        record={trip.emergencyInfo} tripId={trip.id} />
      : tab === "documents" ? <TripDocuments busy={busy} documents={documents} mutate={mutate}
        onNavigate={onNavigate} onScan={onScan} online={online} policies={policies} trip={trip} /> : <>
      <section className="travel-summary-grid">
        <article><small>Transport</small><strong>{trip.transport || "Not added"}</strong></article>
        <article><small>Accommodation</small><strong>{trip.accommodation || "Not added"}</strong></article>
        <article><small>Booking reference</small><strong>{trip.bookingReference || "Not added"}</strong></article>
        <article><small>Currency</small><strong>{trip.currency}</strong></article>
      </section>
      <section className="travel-section-panel"><header><div><p>Plan at a glance</p>
        <h2>Journey overview</h2></div><button type="button" disabled={!online} onClick={onEdit}>Edit</button></header>
        <div className="travel-overview-list">
          <article><span>Travellers</span><strong>{trip.travellerSummary
            || trip.travellers.map((item) => item.displayName).join(", ") || "Not added"}</strong></article>
          <article><span>Itinerary</span><strong>{trip.itinerary.length} items</strong></article>
          <article><span>Bookings</span><strong>{trip.bookings.length} records</strong></article>
          <article><span>Documents</span><strong>{trip.documentLinks.length} linked</strong></article>
          <article><span>Expenses</span><strong>{trip.expenses.length} recorded</strong></article>
        </div>
        {trip.notes ? <p className="travel-notes">{trip.notes}</p> : null}
      </section>
      <TripActions busy={busy} checklist={checklist} mutate={mutate} onDuplicated={onBack}
        online={online} trip={trip} />
    </>}
  </>;
}
