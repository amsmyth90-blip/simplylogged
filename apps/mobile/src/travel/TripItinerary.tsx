import { useMemo, useState } from "react";

import { itineraryTypes, type TravelItineraryItem, type TravelTraveller } from "@diarydock/travel";

import type { TravelDraftMutation } from "./travel-client";
import { TravelRecordModal } from "./TravelRecordModal";
import { tripDate } from "./travel-format";

type Draft = Omit<TravelItineraryItem, "id">;

function Editor({ busy, currency, mutate, onClose, record, timezone, travellers, tripId }: {
  busy: boolean; currency: string; mutate: (value: TravelDraftMutation) => Promise<boolean>;
  onClose: () => void; record: TravelItineraryItem | null; timezone: string;
  travellers: TravelTraveller[]; tripId: string;
}) {
  const [draft, setDraft] = useState<Draft>(record ? { ...record }
    : { type: "Other", title: "", date: "", startTime: "", endTime: "", timezone,
      location: "", address: "", provider: "", bookingReference: "", notes: "",
      cost: 0, currency, travellerIds: [], confirmed: false, sortOrder: 0 });
  const set = <Key extends keyof Draft>(key: Key, value: Draft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  function toggleTraveller(id: string) {
    set("travellerIds", draft.travellerIds.includes(id)
      ? draft.travellerIds.filter((value) => value !== id) : [...draft.travellerIds, id]);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (await mutate({ operation: "SAVE_ITINERARY", tripId,
      recordId: record?.id ?? null, record: draft })) onClose();
  }
  async function remove() {
    if (!record || !window.confirm(`Delete ${record.title}?`)) return;
    if (await mutate({ operation: "DELETE_ITINERARY", tripId, recordId: record.id })) onClose();
  }
  return <TravelRecordModal busy={busy} label="Itinerary" onClose={onClose}
    onDelete={record ? () => void remove() : undefined} onSubmit={(event) => void save(event)}
    title={record?.title ?? "Add itinerary item"}><div className="travel-editor-grid">
      <label>Type<select value={draft.type}
        onChange={(event) => set("type", event.target.value as Draft["type"])}>
        {itineraryTypes.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Date<input required type="date" value={draft.date}
        onChange={(event) => set("date", event.target.value)} /></label>
      <label className="is-wide">Title<input required maxLength={160} value={draft.title}
        onChange={(event) => set("title", event.target.value)} /></label>
      <label>Starts<input type="time" value={draft.startTime}
        onChange={(event) => set("startTime", event.target.value)} /></label>
      <label>Ends<input type="time" value={draft.endTime}
        onChange={(event) => set("endTime", event.target.value)} /></label>
      <label>Location<input maxLength={240} value={draft.location}
        onChange={(event) => set("location", event.target.value)} /></label>
      <label>Provider<input maxLength={160} value={draft.provider}
        onChange={(event) => set("provider", event.target.value)} /></label>
      <label className="is-wide">Address<input maxLength={500} value={draft.address}
        onChange={(event) => set("address", event.target.value)} /></label>
      <label>Reference<input maxLength={120} value={draft.bookingReference}
        onChange={(event) => set("bookingReference", event.target.value)} /></label>
      <label>Timezone<input required maxLength={80} value={draft.timezone}
        onChange={(event) => set("timezone", event.target.value)} /></label>
      <label>Cost<input type="number" min="0" max="100000000" step="0.01" value={draft.cost}
        onChange={(event) => set("cost", Number(event.target.value))} /></label>
      <label>Currency<input required maxLength={3} value={draft.currency}
        onChange={(event) => set("currency", event.target.value.toUpperCase())} /></label>
      <fieldset className="travel-person-picker"><legend>Travellers</legend>{travellers.map((person) =>
        <label key={person.id}><input type="checkbox" checked={draft.travellerIds.includes(person.id)}
          onChange={() => toggleTraveller(person.id)} />{person.displayName}</label>)}</fieldset>
      <label className="travel-check-field"><input type="checkbox" checked={draft.confirmed}
        onChange={(event) => set("confirmed", event.target.checked)} /> Confirmed</label>
      <label className="is-wide">Notes<textarea maxLength={2_000} value={draft.notes}
        onChange={(event) => set("notes", event.target.value)} /></label>
    </div></TravelRecordModal>;
}

export function TripItinerary({ busy, currency, mutate, online, records, timezone,
  travellers, tripId }: {
  busy: boolean; currency: string; mutate: (value: TravelDraftMutation) => Promise<boolean>;
  online: boolean; records: TravelItineraryItem[]; timezone: string;
  travellers: TravelTraveller[]; tripId: string;
}) {
  const [editing, setEditing] = useState<TravelItineraryItem | null | undefined>();
  const ordered = useMemo(() => [...records].sort((a, b) =>
    `${a.date}-${a.startTime}-${a.sortOrder}`.localeCompare(`${b.date}-${b.startTime}-${b.sortOrder}`)), [records]);
  return <section className="travel-section-panel"><header><div><p>Your days away</p>
    <h2>Itinerary</h2></div><button type="button" disabled={!online}
      onClick={() => setEditing(null)}>＋ Add</button></header>
    {ordered.length ? <div className="travel-record-list">{ordered.map((record) =>
      <button type="button" key={record.id} onClick={() => setEditing(record)}>
        <span>{record.startTime || record.type.slice(0, 1)}</span><div><strong>{record.title}</strong>
          <small>{tripDate(record.date)} · {record.location || record.type}</small></div>
        <b>{record.confirmed ? "Ready" : "›"}</b></button>)}</div>
      : <div className="travel-empty"><strong>No itinerary items</strong>
        <span>Add travel, check-ins, activities and free time.</span></div>}
    {editing !== undefined ? <Editor busy={busy || !online} currency={currency} mutate={mutate}
      onClose={() => setEditing(undefined)} record={editing} timezone={timezone}
      travellers={travellers} tripId={tripId} /> : null}
  </section>;
}
