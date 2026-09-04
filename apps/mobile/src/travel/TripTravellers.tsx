import { useState } from "react";

import type { TravelTraveller } from "@diarydock/travel";

import type { TravelDraftMutation } from "./travel-client";
import { TravelRecordModal } from "./TravelRecordModal";

type Draft = Omit<TravelTraveller, "id">;
const blank: Draft = { displayName: "", source: "other", travellerType: "adult",
  isLead: false, passportRequired: true, passportStatus: "not-recorded",
  visaStatus: "not-recorded", accessibilityNotes: "", dietaryNotes: "", medicationNotes: "" };

function Editor({ busy, mutate, onClose, record, tripId }: {
  busy: boolean; mutate: (value: TravelDraftMutation) => Promise<boolean>; onClose: () => void;
  record: TravelTraveller | null; tripId: string;
}) {
  const [draft, setDraft] = useState<Draft>(record ? { displayName: record.displayName,
    source: record.source, travellerType: record.travellerType, isLead: record.isLead,
    passportRequired: record.passportRequired, passportStatus: record.passportStatus,
    visaStatus: record.visaStatus, accessibilityNotes: record.accessibilityNotes,
    dietaryNotes: record.dietaryNotes, medicationNotes: record.medicationNotes } : blank);
  const set = <Key extends keyof Draft>(key: Key, value: Draft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (await mutate({ operation: "SAVE_TRAVELLER", tripId,
      recordId: record?.id ?? null, record: draft })) onClose();
  }
  async function remove() {
    if (!record || !window.confirm(`Remove ${record.displayName} from this trip?`)) return;
    if (await mutate({ operation: "DELETE_TRAVELLER", tripId, recordId: record.id })) onClose();
  }
  return <TravelRecordModal busy={busy} label="Traveller" onClose={onClose}
    onDelete={record ? () => void remove() : undefined} onSubmit={(event) => void save(event)}
    title={record?.displayName ?? "Add traveller"}>
    <div className="travel-editor-grid">
      <label className="is-wide">Name<input required maxLength={120} value={draft.displayName}
        onChange={(event) => set("displayName", event.target.value)} /></label>
      <label>Traveller type<select value={draft.travellerType}
        onChange={(event) => set("travellerType", event.target.value as Draft["travellerType"])}>
        <option value="adult">Adult</option><option value="child">Child</option>
        <option value="pet">Pet</option></select></label>
      <label>Source<select value={draft.source}
        onChange={(event) => set("source", event.target.value as Draft["source"])}>
        <option value="household">Household</option><option value="contact">Contact</option>
        <option value="other">Other</option></select></label>
      <label>Passport<select value={draft.passportStatus}
        onChange={(event) => set("passportStatus", event.target.value as Draft["passportStatus"])}>
        <option value="not-recorded">Not recorded</option><option value="review-needed">Review needed</option>
        <option value="ready">Ready</option></select></label>
      <label>Visa<select value={draft.visaStatus}
        onChange={(event) => set("visaStatus", event.target.value as Draft["visaStatus"])}>
        <option value="not-required">Not required</option><option value="not-recorded">Not recorded</option>
        <option value="review-needed">Review needed</option><option value="ready">Ready</option></select></label>
      <label className="travel-check-field"><input type="checkbox" checked={draft.isLead}
        onChange={(event) => set("isLead", event.target.checked)} /> Lead traveller</label>
      <label className="travel-check-field"><input type="checkbox" checked={draft.passportRequired}
        onChange={(event) => set("passportRequired", event.target.checked)} /> Passport required</label>
      <label className="is-wide">Accessibility notes<textarea maxLength={1_000}
        value={draft.accessibilityNotes} onChange={(event) => set("accessibilityNotes", event.target.value)} /></label>
      <label>Dietary notes<textarea maxLength={1_000} value={draft.dietaryNotes}
        onChange={(event) => set("dietaryNotes", event.target.value)} /></label>
      <label>Medication notes<textarea maxLength={1_000} value={draft.medicationNotes}
        onChange={(event) => set("medicationNotes", event.target.value)} /></label>
    </div>
  </TravelRecordModal>;
}

export function TripTravellers({ busy, mutate, online, records, summary, tripId }: {
  busy: boolean; mutate: (value: TravelDraftMutation) => Promise<boolean>; online: boolean;
  records: TravelTraveller[]; summary: string; tripId: string;
}) {
  const [editing, setEditing] = useState<TravelTraveller | null | undefined>();
  return <section className="travel-section-panel"><header><div><p>Who is going</p>
    <h2>Travellers</h2></div><button type="button" disabled={!online}
      onClick={() => setEditing(null)}>＋ Add</button></header>
    {records.length ? <div className="travel-record-list">{records.map((record) =>
      <button type="button" key={record.id} onClick={() => setEditing(record)}>
        <span>{record.displayName.slice(0, 1).toUpperCase()}</span><div><strong>{record.displayName}</strong>
          <small>{record.travellerType} · Passport {record.passportStatus.replace("-", " ")}</small></div>
        <b>{record.isLead ? "Lead" : "›"}</b></button>)}</div>
      : <div className="travel-empty"><strong>{summary || "No travellers added"}</strong>
        <span>Add each person to track travel readiness safely.</span></div>}
    {editing !== undefined ? <Editor busy={busy || !online} mutate={mutate} onClose={() => setEditing(undefined)}
      record={editing} tripId={tripId} /> : null}
  </section>;
}
