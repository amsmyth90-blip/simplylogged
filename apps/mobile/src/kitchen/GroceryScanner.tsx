import { useEffect, useMemo, useState } from "react";

import type { GroceryDateType, ScannedGrocery } from "@diarydock/kitchen";
import type { OfflineStore } from "@diarydock/offline-store";
import { ReminderService } from "@diarydock/reminders";

import { chooseDocumentPhoto, takeDocumentPhoto,
  type CapturedDocument } from "@mobile/capture/capture-source";
import { MobileIcon } from "@mobile/components/MobileIcon";
import { analyseGroceryPhotos } from "./grocery-analysis-client";

type Stage = "capture" | "checking" | "review" | "saved";

type Props = {
  accessToken: string;
  initialGroceries?: ScannedGrocery[];
  online: boolean;
  store: OfflineStore;
  synchronize: () => Promise<unknown>;
  onBack: () => void;
  onSavePantry: (names: string[]) => Promise<boolean>;
};

const dateLabels: Record<GroceryDateType, string> = {
  USE_BY: "Use by",
  BEST_BEFORE: "Best before",
  DISPLAY_UNTIL: "Display until",
};

function reminderId(item: ScannedGrocery) {
  const name = item.name.toLocaleLowerCase("en-GB").replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "").slice(0, 72);
  return `grocery-date:${item.date}:${item.dateType}:${name}`.slice(0, 128);
}

function friendlyDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric",
    timeZone: "Europe/London" }).format(new Date(`${value}T12:00:00Z`));
}

export function GroceryScanner(props: Props) {
  const [stage, setStage] = useState<Stage>(props.initialGroceries?.length ? "review" : "capture");
  const [captures, setCaptures] = useState<CapturedDocument[]>([]);
  const [groceries, setGroceries] = useState<ScannedGrocery[]>(props.initialGroceries ?? []);
  const [selected, setSelected] = useState<Set<number>>(
    new Set((props.initialGroceries ?? []).map((_, index) => index)),
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const previews = useMemo(() => captures.map((capture) => capture.previewUrl
    ?? URL.createObjectURL(new Blob([capture.bytes as BlobPart], { type: capture.mimeType }))), [captures]);

  useEffect(() => () => previews.forEach((url, index) => {
    if (!captures[index]?.previewUrl) URL.revokeObjectURL(url);
  }), [captures, previews]);

  async function add(source: "camera" | "library") {
    setError("");
    if (!props.online) { setError("Connect to scan grocery labels."); return; }
    try {
      const capture = await (source === "camera" ? takeDocumentPhoto() : chooseDocumentPhoto());
      if (!capture) return;
      setCaptures((current) => {
        if (current.length >= 8) { setError("Choose up to eight grocery photos."); return current; }
        if (current.reduce((total, item) => total + item.bytes.byteLength, capture.bytes.byteLength)
          > 16 * 1024 * 1024) {
          setError("Keep the combined grocery photos under 16 MB."); return current;
        }
        return [...current, capture];
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That photo could not be opened.");
    }
  }

  async function analyse() {
    if (!captures.length) return;
    setStage("checking"); setError("");
    try {
      const result = await analyseGroceryPhotos(captures, props.accessToken);
      setGroceries(result.groceries);
      setSelected(new Set(result.groceries.map((_, index) => index)));
      setStage("review");
      if (!result.groceries.length) setError("No clear grocery labels were found. Try closer photos.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The grocery labels could not be checked.");
      setStage("capture");
    }
  }

  function update(index: number, patch: Partial<ScannedGrocery>) {
    setGroceries((current) => current.map((item, itemIndex) => itemIndex === index
      ? { ...item, ...patch } : item));
  }

  function toggle(index: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  }

  async function save() {
    const chosen = groceries.filter((_, index) => selected.has(index));
    if (!chosen.length) { setError("Choose at least one grocery to save."); return; }
    setSaving(true); setError("");
    try {
      if (!await props.onSavePantry(chosen.map((item) => item.name))) {
        throw new Error("The groceries could not be saved to your Pantry.");
      }
      const reminderService = new ReminderService(props.store);
      const existingIds = new Set((await reminderService.list()).map((item) => item.id));
      for (const item of chosen.filter((entry) => entry.date && entry.dateType)) {
        const id = reminderId(item);
        if (existingIds.has(id) || !item.date || !item.dateType) continue;
        await reminderService.createWithId(id, {
          title: `${dateLabels[item.dateType]}: ${item.name}`,
          note: "Date read from a grocery label. Check the original packaging before using the item.",
          roomId: "kitchen",
          roomName: "Kitchen",
          group: "later",
          timeLabel: `${dateLabels[item.dateType]} ${friendlyDate(item.date)}`,
          priority: item.dateType === "USE_BY" ? "high" : "normal",
          dueAt: `${item.date}T09:00:00`,
          timeZone: "Europe/London",
        });
        existingIds.add(id);
      }
      await props.synchronize();
      setStage("saved");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The grocery dates could not be saved safely.");
    } finally {
      setSaving(false);
    }
  }

  if (stage === "checking") return <section className="grocery-centred" aria-live="polite">
    <span><MobileIcon name="camera" /></span><h2>Reading grocery labels</h2>
    <p>Finding products and checking use-by and best-before dates.</p>
  </section>;

  if (stage === "saved") return <section className="grocery-centred grocery-saved">
    <span><MobileIcon name="check" /></span><h2>Groceries saved</h2>
    <p>Your items are in the Pantry. Clear dates were also added to Reminders.</p>
    <button type="button" onClick={props.onBack}>Back to Pantry</button>
  </section>;

  if (stage === "review") return <section className="grocery-review">
    <header><small>Check before saving</small><h2>Groceries and dates</h2>
      <p>Correct anything the camera misread. Items without a clear date can still be saved.</p></header>
    <div className="grocery-results">{groceries.map((item, index) => <article key={`${item.name}-${index}`}
      className={selected.has(index) ? "is-selected" : ""}>
      <button type="button" className="grocery-select" aria-pressed={selected.has(index)}
        aria-label={`${selected.has(index) ? "Remove" : "Include"} ${item.name}`}
        onClick={() => toggle(index)}>{selected.has(index) ? "✓" : ""}</button>
      <label><span>Item</span><input value={item.name} maxLength={120}
        onChange={(event) => update(index, { name: event.target.value })} /></label>
      <label><span>Date</span><input type="date" value={item.date ?? ""}
        onChange={(event) => update(index, { date: event.target.value || null,
          dateType: event.target.value ? item.dateType ?? "USE_BY" : null })} /></label>
      <label><span>Date type</span><select value={item.dateType ?? ""}
        disabled={!item.date} onChange={(event) => update(index,
          { dateType: (event.target.value || null) as GroceryDateType | null })}>
        <option value="">No date found</option><option value="USE_BY">Use by</option>
        <option value="BEST_BEFORE">Best before</option><option value="DISPLAY_UNTIL">Display until</option>
      </select></label>
    </article>)}</div>
    {error ? <p className="pantry-alert" role="alert">{error}</p> : null}
    <button className="pantry-primary" type="button" disabled={saving || !selected.size}
      onClick={() => void save()}>{saving ? "Saving securely…" : "Save groceries & reminders"}</button>
  </section>;

  return <section className="grocery-capture">
    <div className="grocery-capture-hero"><span><MobileIcon name="calendar" /></span>
      <div><h2>Scan groceries &amp; dates</h2><p>Photograph the front and date label after shopping.
        DiaryDock will find use-by and best-before dates for you to confirm.</p></div></div>
    <div className="pantry-photo-actions"><button type="button" disabled={!props.online}
      onClick={() => void add("camera")}>Take label photos</button>
      <button type="button" disabled={!props.online}
        onClick={() => void add("library")}>Choose photos</button></div>
    {captures.length ? <div className="pantry-photo-tray"><header>
      <strong>{captures.length} photo{captures.length === 1 ? "" : "s"} ready</strong>
      <button type="button" onClick={() => setCaptures([])}>Clear</button></header>
      <div>{previews.map((url, index) => <img src={url} key={`${url}-${index}`}
        alt={`Grocery label ${index + 1}`} />)}</div>
      <button className="pantry-check-button" type="button" onClick={() => void analyse()}>
        Read groceries &amp; dates</button></div> : null}
    <aside className="grocery-tips"><strong>For the best result</strong>
      <p>Use one clear photo of the product name and one close-up of the printed date. Always check the pack before eating.</p></aside>
    {error ? <p className="pantry-alert" role="alert">{error}</p> : null}
  </section>;
}
