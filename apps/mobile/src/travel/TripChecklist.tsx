import { useState } from "react";

import { checklistCategories, type TravelChecklistItem } from "@diarydock/travel";

import type { TravelDraftMutation } from "./travel-client";

export function TripChecklist({ busy, items, mutate, online, tripId }: {
  busy: boolean;
  items: TravelChecklistItem[];
  mutate: (mutation: TravelDraftMutation) => Promise<boolean>;
  online: boolean;
  tripId: string;
}) {
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<TravelChecklistItem["category"]>("Essentials");
  const groups = checklistCategories.map((name) => ({ name,
    items: items.filter((item) => item.category === name) })).filter((group) => group.items.length);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!label.trim()) return;
    const saved = await mutate({ operation: "SAVE_CHECKLIST", tripId, recordId: null,
      record: { label, category, completed: false } });
    if (saved) setLabel("");
  }

  return <section className="travel-section-panel">
    <header><div><p>Before you go</p><h2>Travel checklist</h2></div>
      <span>{items.filter((item) => item.completed).length}/{items.length}</span></header>
    <form className="travel-checklist-add" onSubmit={(event) => void add(event)}>
      <input aria-label="Checklist item" maxLength={200} placeholder="Add something to remember"
        value={label} onChange={(event) => setLabel(event.target.value)} />
      <select aria-label="Checklist category" value={category}
        onChange={(event) => setCategory(event.target.value as TravelChecklistItem["category"])}>
        {checklistCategories.map((value) => <option key={value}>{value}</option>)}</select>
      <button type="submit" disabled={!online || busy || !label.trim()}>Add</button>
    </form>
    {groups.length ? groups.map((group) => <div className="travel-checklist-group" key={group.name}>
      <h3>{group.name}</h3>{group.items.map((item) => <div className="travel-checklist-item" key={item.id}>
        <label><input type="checkbox" checked={item.completed} disabled={!online || busy}
          onChange={() => void mutate({ operation: "SAVE_CHECKLIST", tripId,
            recordId: item.id, record: { label: item.label, category: item.category,
              completed: !item.completed } })} /><span>{item.label}</span></label>
        <button type="button" aria-label={`Delete ${item.label}`} disabled={!online || busy}
          onClick={() => void mutate({ operation: "DELETE_CHECKLIST", tripId, recordId: item.id })}>×</button>
      </div>)}</div>) : <div className="travel-empty"><strong>Your checklist is clear</strong>
      <span>Add essentials, documents and home checks above.</span></div>}
  </section>;
}
