import { useState } from "react";

import { tripStatuses, tripTypes, type TravelTrip, type TravelTripDetails } from "@diarydock/travel";

const blank: TravelTripDetails = {
  title: "", destination: "", destinationCity: "", destinationCountry: "",
  destinationTimezone: "Europe/London", startDate: "", endDate: "", tripType: "Other",
  currency: "GBP", travellerSummary: "", transport: "", accommodation: "",
  bookingReference: "", notes: "", status: "draft",
};

export function TripEditor({ busy, trip, onCancel, onDelete, onSave }: {
  busy: boolean;
  trip: TravelTrip | null;
  onCancel: () => void;
  onDelete: (trip: TravelTrip) => Promise<boolean>;
  onSave: (details: TravelTripDetails) => Promise<boolean>;
}) {
  const [form, setForm] = useState<TravelTripDetails>(() => trip ? {
    title: trip.title, destination: trip.destination, destinationCity: trip.destinationCity,
    destinationCountry: trip.destinationCountry, destinationTimezone: trip.destinationTimezone,
    startDate: trip.startDate, endDate: trip.endDate, tripType: trip.tripType,
    currency: trip.currency, travellerSummary: trip.travellerSummary, transport: trip.transport,
    accommodation: trip.accommodation, bookingReference: trip.bookingReference,
    notes: trip.notes, status: trip.status,
  } : blank);
  const [error, setError] = useState("");

  function change<Key extends keyof TravelTripDetails>(key: Key, value: TravelTripDetails[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) { setError("Add a trip title."); return; }
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      setError("The return date must be after the departure date."); return;
    }
    if (await onSave(form)) onCancel();
  }

  return <div className="travel-modal" role="dialog" aria-modal="true" aria-label={
    trip ? `Edit ${trip.title}` : "Create a trip"}>
    <form className="travel-editor" onSubmit={(event) => void submit(event)}>
      <header><div><p>{trip ? "Trip settings" : "New journey"}</p>
        <h2>{trip ? trip.title : "Create a trip"}</h2></div>
        <button type="button" onClick={onCancel} aria-label="Close trip editor">×</button></header>
      <div className="travel-editor-grid">
        <label className="is-wide">Trip title<input required maxLength={160} value={form.title}
          onChange={(event) => change("title", event.target.value)} /></label>
        <label>Trip type<select value={form.tripType}
          onChange={(event) => change("tripType", event.target.value as TravelTripDetails["tripType"])}>
          {tripTypes.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Status<select value={form.status}
          onChange={(event) => change("status", event.target.value as TravelTripDetails["status"])}>
          {tripStatuses.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label>Destination city<input maxLength={120} value={form.destinationCity}
          onChange={(event) => change("destinationCity", event.target.value)} /></label>
        <label>Country<input maxLength={120} value={form.destinationCountry}
          onChange={(event) => change("destinationCountry", event.target.value)} /></label>
        <label>Departs<input type="date" value={form.startDate}
          onChange={(event) => change("startDate", event.target.value)} /></label>
        <label>Returns<input type="date" value={form.endDate}
          onChange={(event) => change("endDate", event.target.value)} /></label>
        <label>Timezone<input required maxLength={80} value={form.destinationTimezone}
          onChange={(event) => change("destinationTimezone", event.target.value)} /></label>
        <label>Currency<input required maxLength={3} value={form.currency}
          onChange={(event) => change("currency", event.target.value.toUpperCase())} /></label>
        <label className="is-wide">Travellers<input maxLength={500} value={form.travellerSummary}
          onChange={(event) => change("travellerSummary", event.target.value)} /></label>
        <label>Transport<input maxLength={200} value={form.transport}
          onChange={(event) => change("transport", event.target.value)} /></label>
        <label>Accommodation<input maxLength={240} value={form.accommodation}
          onChange={(event) => change("accommodation", event.target.value)} /></label>
        <label className="is-wide">Booking reference<input maxLength={120}
          value={form.bookingReference} onChange={(event) => change("bookingReference", event.target.value)} /></label>
        <label className="is-wide">Notes<textarea maxLength={4_000} value={form.notes}
          onChange={(event) => change("notes", event.target.value)} /></label>
      </div>
      {error ? <p className="travel-editor-error" role="alert">{error}</p> : null}
      <footer>{trip ? <button className="is-delete" type="button" disabled={busy}
        onClick={() => void onDelete(trip).then((removed) => { if (removed) onCancel(); })}>
        Delete trip</button> : <span />}
        <button className="is-save" type="submit" disabled={busy}>{busy ? "Saving…" : "Save trip"}</button></footer>
    </form>
  </div>;
}
