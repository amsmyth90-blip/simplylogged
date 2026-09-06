import type { KitchenItem } from "@diarydock/kitchen";

import { MobileIcon } from "@mobile/components/MobileIcon";
import type { PantryStage } from "./use-pantry-planner";

export function PantryCaptureStage(props: {
  addItem: (name: string) => Promise<void>;
  busy: boolean;
  captures: number;
  error: string;
  items: KitchenItem[];
  online: boolean;
  previews: string[];
  setCaptures: () => void;
  onAddPhoto: (source: "camera" | "library") => void;
  onAnalyse: () => void;
  onToggle: (item: KitchenItem) => void;
  stage: PantryStage;
}) {
  if (props.stage !== "capture") return null;
  return <main className="pantry-capture-stage">
    <section className="pantry-capture-card">
      <div className="pantry-capture-intro">
        <span><MobileIcon name="camera" /></span>
        <div><h2>See what&apos;s in your kitchen</h2><p>Photograph your fridge, freezer or cupboards.
          DiaryDock will organise what it finds and suggest meals.</p></div>
      </div>
      <div className="pantry-photo-actions">
        <button type="button" disabled={!props.online}
          onClick={() => props.onAddPhoto("camera")}>Take photos</button>
        <button type="button" disabled={!props.online}
          onClick={() => props.onAddPhoto("library")}>Choose photos</button>
      </div>
    </section>

    {props.captures ? <section className="pantry-photo-tray">
      <header><strong>{props.captures} photo{props.captures === 1 ? "" : "s"} ready</strong>
        <button type="button" onClick={props.setCaptures}>Clear</button></header>
      <div>{props.previews.map((url, index) => <img key={`${url}-${index}`} src={url}
        alt={`Kitchen photo ${index + 1}`} />)}
        {props.captures < 8 ? <button type="button" aria-label="Add another kitchen photo"
          onClick={() => props.onAddPhoto("camera")}><MobileIcon name="plus" /></button> : null}</div>
      <button className="pantry-check-button" type="button" onClick={props.onAnalyse}>Check my kitchen</button>
    </section> : null}

    {props.error ? <p className="pantry-alert" role="alert">{props.error}</p> : null}
    <PantryOverview items={props.items} busy={props.busy} online={props.online}
      onToggle={props.onToggle} />
    <PantryQuickAdd disabled={props.busy || !props.online} onAdd={props.addItem} />
  </main>;
}

function PantryOverview(props: {
  busy: boolean;
  items: KitchenItem[];
  online: boolean;
  onToggle: (item: KitchenItem) => void;
}) {
  return <section className="pantry-overview">
    {(["Pantry", "Shopping"] as const).map((section) => {
      const items = props.items.filter((item) => item.section === section);
      return <article key={section}><header><h2>{section}</h2><span>{items.length}</span></header>
        <div>{items.slice(0, 4).map((item) => <button type="button" key={item.id}
          className={item.checked ? "is-checked" : ""} disabled={props.busy || !props.online}
          onClick={() => props.onToggle(item)}><i>{item.checked ? "✓" : ""}</i><span>{item.name}</span></button>)}
          {!items.length ? <p>Nothing here yet</p> : null}</div></article>;
    })}
  </section>;
}

function PantryQuickAdd(props: { disabled: boolean; onAdd: (name: string) => Promise<void> }) {
  async function submit(form: HTMLFormElement) {
    const input = form.elements.namedItem("item") as HTMLInputElement;
    if (!input.value.trim()) return;
    await props.onAdd(input.value);
    input.value = "";
  }
  return <form className="pantry-quick-add" onSubmit={(event) => {
    event.preventDefault(); void submit(event.currentTarget);
  }}><input name="item" maxLength={120} disabled={props.disabled} placeholder="Add to shopping list" />
    <button type="submit" disabled={props.disabled}>Add</button></form>;
}
