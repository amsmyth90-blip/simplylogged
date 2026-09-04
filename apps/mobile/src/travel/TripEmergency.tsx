import { useState } from "react";

import type { TravelEmergencyInfo } from "@diarydock/travel";

import type { TravelDraftMutation } from "./travel-client";

const fields: Array<[keyof TravelEmergencyInfo, string]> = [
  ["destinationEmergencyNumber", "Destination emergency number"],
  ["localContact", "Local contact"],
  ["accommodationAddress", "Accommodation address"],
  ["embassyNotes", "Embassy or consulate"],
  ["medicalNotes", "Medical notes"],
  ["lostPassportNotes", "Lost passport plan"],
  ["breakdownDetails", "Breakdown details"],
  ["documentLocationNotes", "Where travel documents are stored"],
];

export function TripEmergency({ busy, mutate, online, record, tripId }: {
  busy: boolean; mutate: (value: TravelDraftMutation) => Promise<boolean>; online: boolean;
  record: TravelEmergencyInfo; tripId: string;
}) {
  const [draft, setDraft] = useState(record);
  const [editing, setEditing] = useState(false);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (await mutate({ operation: "SAVE_EMERGENCY", tripId, record: draft })) setEditing(false);
  }
  if (!editing) return <section className="travel-section-panel"><header><div><p>Ready if needed</p>
    <h2>Emergency information</h2></div><button type="button" disabled={!online}
      onClick={() => setEditing(true)}>Edit</button></header>
    <div className="travel-overview-list">{fields.map(([key, label]) =>
      <article key={key}><span>{label}</span><strong>{record[key] || "Not added"}</strong></article>)}</div>
    <p className="travel-privacy-note">Only practical emergency notes are shown here. Original identity
      records remain in secure All Files storage.</p>
  </section>;
  return <section className="travel-section-panel"><header><div><p>Ready if needed</p>
    <h2>Edit emergency information</h2></div><button type="button"
      onClick={() => { setDraft(record); setEditing(false); }}>Cancel</button></header>
    <form className="travel-emergency-form" onSubmit={(event) => void save(event)}>
      {fields.map(([key, label]) => <label key={key}>{label}<textarea maxLength={2_000}
        value={draft[key]} onChange={(event) => setDraft((current) => ({
          ...current, [key]: event.target.value }))} /></label>)}
      <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save emergency information"}</button>
    </form>
  </section>;
}
