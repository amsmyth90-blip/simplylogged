import { useState, type FormEvent } from "react";

import type { EmergencyDraftMutation } from "./emergency-client";

export type EmergencyEditorMode = "CONTACT" | "HOME" | "PLAN";

const labels: Record<EmergencyEditorMode, string> = {
  CONTACT: "Add emergency contact",
  HOME: "Add home information",
  PLAN: "Add household plan",
};

export function EmergencyEditor(props: {
  busy: boolean;
  mode: EmergencyEditorMode;
  onCancel: () => void;
  onSave: (mutation: EmergencyDraftMutation) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [steps, setSteps] = useState("");
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const mutation: EmergencyDraftMutation = props.mode === "CONTACT"
      ? { operation: "ADD_CONTACT", name, relation, phone, ...(note.trim() ? { note } : {}) }
      : props.mode === "PLAN"
        ? {
          operation: "ADD_PLAN",
          title,
          summary,
          steps: steps.split("\n").map((item) => item.trim()).filter(Boolean),
        }
        : { operation: "ADD_HOME_INFO", label, value };
    if (await props.onSave(mutation)) props.onCancel();
  }

  return (
    <div className="emergency-editor-backdrop">
      <form className="emergency-editor" role="dialog" aria-modal="true" aria-labelledby="emergency-editor-title" onKeyDown={(event) => { if (event.key === "Escape") props.onCancel(); }} onSubmit={(event) => void submit(event)}>
        <header><div><p className="emergency-kicker">Secure update</p><h2 id="emergency-editor-title">{labels[props.mode]}</h2></div><button type="button" onClick={props.onCancel} aria-label="Close">×</button></header>
        {props.mode === "CONTACT" ? <>
          <label>Name<input required autoFocus maxLength={120} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} /></label>
          <div className="emergency-form-grid">
            <label>Relationship<input required maxLength={120} value={relation} onChange={(event) => setRelation(event.target.value)} /></label>
            <label>Phone<input required maxLength={40} type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
          </div>
          <label>Note<input maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Holds a spare key" /></label>
        </> : null}
        {props.mode === "PLAN" ? <>
          <label>Title<input required autoFocus maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label>Summary<textarea required maxLength={400} rows={3} value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
          <label>Steps, one per line<textarea required maxLength={10_000} rows={7} value={steps} onChange={(event) => setSteps(event.target.value)} placeholder={"Call the insurer\nMove key documents upstairs"} /></label>
        </> : null}
        {props.mode === "HOME" ? <>
          <label>Label<input required autoFocus maxLength={120} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Water stopcock" /></label>
          <label>Where or what to know<textarea required maxLength={500} rows={4} value={value} onChange={(event) => setValue(event.target.value)} /></label>
        </> : null}
        <footer><button type="button" onClick={props.onCancel}>Cancel</button><button className="emergency-primary" disabled={props.busy} type="submit">{props.busy ? "Saving…" : "Save securely"}</button></footer>
      </form>
    </div>
  );
}
