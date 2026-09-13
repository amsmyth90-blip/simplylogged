"use client";
import { useState } from "react";
import { parseCommand, type GroceryDraft, type GroceryCommand } from "../../lib/groceries/model";
import { groceryFrames } from "../../lib/groceries/media";
import { GroceryRequestError, type GroceryRequest } from "../../lib/groceries/client";
import { GroceryReview } from "./GroceryReview";
import { GroceryCapture } from "./GroceryCapture";
import { GroceryStock } from "./GroceryStock";
import { useGroceryItems } from "./useGroceryItems";
import "./groceries.css";

export function GroceryPanel({ request, enablePush, onReminders }: {
  request: GroceryRequest;
  enablePush?: () => Promise<boolean>; onReminders: () => void;
}) {
  const stock = useGroceryItems(request);
  const [view, setView] = useState<"stock" | "capture" | "review">("stock");
  const [drafts, setDrafts] = useState<GroceryDraft[]>([]);
  const [frames, setFrames] = useState<File[]>([]);
  const [kind, setKind] = useState("Photo");
  const [working, setWorking] = useState("");
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState<GroceryCommand | null>(null);
  const busy = Boolean(working), locked = busy || Boolean(pending);
  const edit = (rows: GroceryDraft[]) => { setDrafts(rows); setConfirmed(false); };
  const start = (label: string) => { setWorking(label); setMessage(""); setFailed(false); };
  const fail = (error: unknown) => { setFailed(true); setMessage(error instanceof Error ? error.message : "Please try again."); };

  async function prepare(files: File[]) {
    if (!files.length) return;
    const video = files.some(file => file.type.startsWith("video/"));
    start(video ? "Preparing your video…" : "Preparing your photos…");
    try {
      setFrames(await groceryFrames(files));
      setKind(video ? "Video" : files.length > 1 ? "Photos" : "Photo");
    } catch (error) { fail(error); } finally { setWorking(""); }
  }
  async function read() {
    start("Uploading label images and reading products…");
    try {
      const form = new FormData(); frames.forEach(file => form.append("files", file));
      const result = await request("POST", form);
      if (!result.items?.length) throw Error("No labels could be read. Try a closer photo or add a product manually.");
      if (drafts.length + result.items.length > 40) throw Error("Save these products before scanning more (40 per batch).");
      edit([...drafts, ...result.items as GroceryDraft[]]);
      setFrames([]); setView("review");
      setMessage("✓ Labels read. Check the products and dates below.");
    } catch (error) { fail(error); } finally { setWorking(""); }
  }
  async function save() {
    start("Saving products and reminders…");
    try {
      const command = pending ?? parseCommand({ operation: "SAVE", batchId: crypto.randomUUID(), confirmed,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, items: drafts });
      setPending(command); await request("POST", command);
      setPending(null); setDrafts([]); setFrames([]); setConfirmed(false); setView("stock");
      setMessage("✓ Shopping saved. Your products and dates are in My groceries.");
      await stock.reload();
    } catch (error) {
      if (error instanceof GroceryRequestError && error.status === 400) setPending(null);
      fail(error);
    } finally { setWorking(""); }
  }
  async function used(id: string) {
    start("Updating product…");
    try {
      await request("POST", { operation: "USE", id }); await stock.reload();
      setMessage("✓ Marked used up. Remaining reminders cancelled.");
    } catch (error) { fail(error); } finally { setWorking(""); }
  }
  const scan = () => { setMessage(""); setView(drafts.length ? "review" : "capture"); };
  return <section className="grocery-panel" aria-label="Groceries and expiry reminders">
    <header><div><h1>My groceries</h1><p>Your products, dates and reminders.</p></div>
      <button onClick={onReminders} disabled={busy}>Reminders</button></header>
    <nav className="grocery-tabs" aria-label="Grocery views">
      <button disabled={busy} aria-pressed={view === "stock"} onClick={() => setView("stock")}>My groceries ({stock.items.length})</button>
      <button disabled={busy} aria-pressed={view !== "stock"} onClick={scan}>{drafts.length ? "Check products (" + drafts.length + ")" : "Scan shopping"}</button>
    </nav>
    {view !== "stock" ? <ol className="grocery-steps" aria-label="Scan progress">
      <li aria-current={view === "capture" ? "step" : undefined}>1. Add photo / video</li>
      <li aria-current={view === "review" ? "step" : undefined}>2. Check &amp; save</li>
    </ol> : null}
    {working ? <div className="grocery-working" role="status"><span className="grocery-spinner" aria-hidden="true" />
      <div><strong>{working}</strong><p>Please keep this page open.</p></div></div> : null}
    {message ? <p className={"grocery-message " + (failed ? "is-error" : "is-success")} role={failed ? "alert" : "status"}>{message}</p> : null}
    {view === "stock" ? <GroceryStock {...stock} busy={locked} onRetry={() => void stock.reload()}
      onUsed={id => void used(id)} onScan={scan} /> : null}
    {view === "capture" ? <GroceryCapture frames={frames} kind={kind} busy={busy} locked={locked}
      onFiles={files => void prepare(files)}
      onRead={() => void read()} onClear={() => setFrames([])}
      onManual={() => { edit([{ id: crypto.randomUUID(), name: "", quantity: "", date: "", dateType: "unknown", dateText: "" }]); setView("review"); }} /> : null}
    {view === "review" ? <section className="grocery-review-section"><h2>Check products &amp; dates</h2>
      <GroceryReview items={drafts} onChange={edit} locked={locked} />
      <label className="grocery-confirm"><input type="checkbox" checked={confirmed} disabled={locked}
        onChange={event => setConfirmed(event.target.checked)} />I have checked all products and dates against the packaging.</label>
      <button className="grocery-primary grocery-wide" disabled={busy || !confirmed || !drafts.length} onClick={() => void save()}>
        {busy ? "Saving…" : pending ? "Retry save" : "Save " + drafts.length + " product" + (drafts.length === 1 ? "" : "s")}</button>
      {!pending ? <button disabled={busy} onClick={() => { edit([]); setView("capture"); }}>Start again</button>
        : <p className="grocery-small">Retry keeps the same batch so it cannot be saved twice.</p>}
    </section> : null}
    <details className="grocery-options"><summary>Reminders &amp; phone alerts</summary>
      <p>Reminders appear at 8am, two days and one day before each confirmed date. Past reminder times are skipped.</p>
      {enablePush ? <button disabled={busy} onClick={() => {
        start("Setting up phone alerts…");
        void enablePush().then(ok => setMessage(ok ? "Phone alerts enabled." : "Phone alerts are unavailable. You can still view your reminders in DiaryDock."))
          .catch(fail).finally(() => setWorking(""));
      }}>Enable phone alerts</button> : null}
    </details>
  </section>;
}
