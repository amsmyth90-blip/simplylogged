import { useState } from "react";

import { bookingStatuses, bookingTypes, type TravelBooking,
  type TravelTraveller } from "@diarydock/travel";

import type { TravelDraftMutation } from "./travel-client";
import { TravelRecordModal } from "./TravelRecordModal";

type Draft = Omit<TravelBooking, "id">;

function Editor({ busy, currency, mutate, onClose, record, timezone, travellers, tripId }: {
  busy: boolean; currency: string; mutate: (value: TravelDraftMutation) => Promise<boolean>;
  onClose: () => void; record: TravelBooking | null; timezone: string;
  travellers: TravelTraveller[]; tripId: string;
}) {
  const [draft, setDraft] = useState<Draft>(record ? { ...record }
    : { type: "Other", title: "", provider: "", bookingReference: "", status: "draft",
      startAt: "", endAt: "", timezone, location: "", address: "", amount: 0, currency,
      paymentStatus: "not-applicable", cancellationDeadline: "", contactDetails: "",
      travellerIds: [], notes: "" });
  const set = <Key extends keyof Draft>(key: Key, value: Draft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  function toggleTraveller(id: string) {
    set("travellerIds", draft.travellerIds.includes(id)
      ? draft.travellerIds.filter((value) => value !== id) : [...draft.travellerIds, id]);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (await mutate({ operation: "SAVE_BOOKING", tripId,
      recordId: record?.id ?? null, record: draft })) onClose();
  }
  async function remove() {
    if (!record || !window.confirm(`Delete ${record.title}?`)) return;
    if (await mutate({ operation: "DELETE_BOOKING", tripId, recordId: record.id })) onClose();
  }
  return <TravelRecordModal busy={busy} label="Booking" onClose={onClose}
    onDelete={record ? () => void remove() : undefined} onSubmit={(event) => void save(event)}
    title={record?.title ?? "Add booking"}><div className="travel-editor-grid">
      <label>Type<select value={draft.type}
        onChange={(event) => set("type", event.target.value as Draft["type"])}>
        {bookingTypes.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Status<select value={draft.status}
        onChange={(event) => set("status", event.target.value as Draft["status"])}>
        {bookingStatuses.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <label className="is-wide">Title<input required maxLength={160} value={draft.title}
        onChange={(event) => set("title", event.target.value)} /></label>
      <label>Provider<input maxLength={160} value={draft.provider}
        onChange={(event) => set("provider", event.target.value)} /></label>
      <label>Reference<input maxLength={120} value={draft.bookingReference}
        onChange={(event) => set("bookingReference", event.target.value)} /></label>
      <label>Starts<input type="datetime-local" value={draft.startAt.slice(0, 16)}
        onChange={(event) => set("startAt", event.target.value)} /></label>
      <label>Ends<input type="datetime-local" value={draft.endAt.slice(0, 16)}
        onChange={(event) => set("endAt", event.target.value)} /></label>
      <label>Timezone<input required maxLength={80} value={draft.timezone}
        onChange={(event) => set("timezone", event.target.value)} /></label>
      <label>Location<input maxLength={240} value={draft.location}
        onChange={(event) => set("location", event.target.value)} /></label>
      <label className="is-wide">Address<input maxLength={500} value={draft.address}
        onChange={(event) => set("address", event.target.value)} /></label>
      <label>Amount<input type="number" min="0" max="100000000" step="0.01" value={draft.amount}
        onChange={(event) => set("amount", Number(event.target.value))} /></label>
      <label>Currency<input required maxLength={3} value={draft.currency}
        onChange={(event) => set("currency", event.target.value.toUpperCase())} /></label>
      <label>Payment<select value={draft.paymentStatus}
        onChange={(event) => set("paymentStatus", event.target.value as Draft["paymentStatus"])}>
        <option value="not-applicable">Not applicable</option><option value="unpaid">Unpaid</option>
        <option value="part-paid">Part paid</option><option value="paid">Paid</option></select></label>
      <label>Cancel by<input type="datetime-local" value={draft.cancellationDeadline.slice(0, 16)}
        onChange={(event) => set("cancellationDeadline", event.target.value)} /></label>
      <fieldset className="travel-person-picker"><legend>Travellers</legend>{travellers.map((person) =>
        <label key={person.id}><input type="checkbox" checked={draft.travellerIds.includes(person.id)}
          onChange={() => toggleTraveller(person.id)} />{person.displayName}</label>)}</fieldset>
      <label className="is-wide">Contact details<input maxLength={500} value={draft.contactDetails}
        onChange={(event) => set("contactDetails", event.target.value)} /></label>
      <label className="is-wide">Notes<textarea maxLength={2_000} value={draft.notes}
        onChange={(event) => set("notes", event.target.value)} /></label>
    </div></TravelRecordModal>;
}

export function TripBookings({ busy, currency, mutate, online, records, timezone,
  travellers, tripId }: {
  busy: boolean; currency: string; mutate: (value: TravelDraftMutation) => Promise<boolean>;
  online: boolean; records: TravelBooking[]; timezone: string;
  travellers: TravelTraveller[]; tripId: string;
}) {
  const [editing, setEditing] = useState<TravelBooking | null | undefined>();
  return <section className="travel-section-panel"><header><div><p>Reservations & tickets</p>
    <h2>Bookings</h2></div><button type="button" disabled={!online}
      onClick={() => setEditing(null)}>＋ Add</button></header>
    {records.length ? <div className="travel-record-list">{records.map((record) =>
      <button type="button" key={record.id} onClick={() => setEditing(record)}>
        <span>{record.type.slice(0, 1)}</span><div><strong>{record.title}</strong>
          <small>{record.provider || record.location || "Provider not added"}</small></div>
        <b>{record.status.replace("-", " ")}</b></button>)}</div>
      : <div className="travel-empty"><strong>No bookings added</strong>
        <span>Keep transport, accommodation and reservation details together.</span></div>}
    {editing !== undefined ? <Editor busy={busy || !online} currency={currency} mutate={mutate}
      onClose={() => setEditing(undefined)} record={editing} timezone={timezone}
      travellers={travellers} tripId={tripId} /> : null}
  </section>;
}
