import { useState } from "react";

import type { PhysicalAssetDraft } from "@diarydock/physical-links";

const empty: PhysicalAssetDraft = { name: "", category: "APPLIANCE", location: "",
  manufacturer: "", model: "", serialNumber: "", warrantyDueAt: null,
  nextServiceAt: null, maintenanceNotes: "" };

export function PhysicalAssetEditor(props: { busy: boolean; onCancel: () => void;
  onSave: (asset: PhysicalAssetDraft) => void }) {
  const [draft, setDraft] = useState(empty);
  const update = <Key extends keyof PhysicalAssetDraft>(key: Key, value: PhysicalAssetDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  return <div className="physical-modal" role="dialog" aria-modal="true"
    aria-labelledby="physical-asset-title"><form onSubmit={(event) => {
      event.preventDefault(); props.onSave({ ...draft, name: draft.name.trim() }); }}>
      <header><div><small>Smart item</small><h2 id="physical-asset-title">Add an item</h2></div>
        <button type="button" onClick={props.onCancel} aria-label="Close">×</button></header>
      <label><span>Name</span><input value={draft.name} maxLength={120} required
        onChange={(event) => update("name", event.target.value)} placeholder="Kitchen boiler" /></label>
      <div className="physical-form-grid"><label><span>Type</span><select value={draft.category}
        onChange={(event) => update("category", event.target.value as PhysicalAssetDraft["category"])}>
        <option value="APPLIANCE">Appliance</option><option value="BOILER">Boiler</option>
        <option value="EQUIPMENT">Equipment</option><option value="OTHER">Other</option>
      </select></label><label><span>Location</span><input value={draft.location} maxLength={120}
        onChange={(event) => update("location", event.target.value)} placeholder="Utility room" /></label></div>
      <div className="physical-form-grid"><label><span>Maker</span><input value={draft.manufacturer}
        maxLength={120} onChange={(event) => update("manufacturer", event.target.value)} /></label>
        <label><span>Model</span><input value={draft.model} maxLength={120}
          onChange={(event) => update("model", event.target.value)} /></label></div>
      <label><span>Serial number</span><input value={draft.serialNumber} maxLength={100}
        onChange={(event) => update("serialNumber", event.target.value)}
        placeholder="Only the final four characters are stored" /></label>
      <div className="physical-form-grid"><label><span>Warranty ends</span><input type="date"
        value={draft.warrantyDueAt ?? ""}
        onChange={(event) => update("warrantyDueAt", event.target.value || null)} /></label>
        <label><span>Next service</span><input type="date" value={draft.nextServiceAt ?? ""}
          onChange={(event) => update("nextServiceAt", event.target.value || null)} /></label></div>
      <label><span>Maintenance notes</span><textarea value={draft.maintenanceNotes} maxLength={1000}
        onChange={(event) => update("maintenanceNotes", event.target.value)} /></label>
      <footer><button type="button" onClick={props.onCancel}>Cancel</button>
        <button type="submit" disabled={props.busy || !draft.name.trim()}>Save item</button></footer>
    </form></div>;
}
