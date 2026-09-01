"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { UiIcon } from "@/components/UiIcon";

type Candidate = { type: "ASSET" | "DOCUMENT"; id: string; label: string; detail: string; eligible: boolean };
type HandoverItem = { id: string; resource_type: Candidate["type"]; resource_id: string; preview_snapshot: Record<string, unknown>; added_at: string };
type Draft = { id: string; name: string; status: "DRAFT"; updated_at: string };
type Payload = { draft?: Draft | null; items?: HandoverItem[]; candidates?: Candidate[]; exclusions?: string[]; error?: string };

export function HomeHandoverWorkspace() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [items, setItems] = useState<HandoverItem[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [exclusions, setExclusions] = useState<string[]>([]);
  const [name, setName] = useState("My home handover");
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [message, setMessage] = useState("");

  const selectedKeys = useMemo(() => new Set(items.map((item) => `${item.resource_type}:${item.resource_id}`)), [items]);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/home-handover", { cache: "no-store" });
      const payload = await response.json() as Payload;
      if (!response.ok) throw new Error(payload.error || "Home Handover could not be loaded.");
      setDraft(payload.draft ?? null);
      setItems(payload.items ?? []);
      setCandidates(payload.candidates ?? []);
      setExclusions(payload.exclusions ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Home Handover could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const request = async (body: Record<string, unknown>) => {
    const response = await fetch("/api/home-handover", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json() as { error?: string };
    if (!response.ok) throw new Error(payload.error || "That handover change could not be saved.");
  };

  const createDraft = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusyKey("create"); setMessage("");
    try {
      await request({ operation: "CREATE_PACK", name });
      setMessage("Your private draft is ready. Nothing has been shared or exported.");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "That draft could not be created."); }
    finally { setBusyKey(""); }
  };

  const toggleItem = async (candidate: Candidate) => {
    if (!draft) return;
    const key = `${candidate.type}:${candidate.id}`;
    const selected = selectedKeys.has(key);
    setBusyKey(key); setMessage("");
    try {
      await request({ operation: "SET_ITEM", packId: draft.id, resourceType: candidate.type, resourceId: candidate.id, selected: !selected });
      setMessage(selected ? "Item removed from the private preview." : "Item added to the private preview.");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "That item could not be changed."); }
    finally { setBusyKey(""); }
  };

  return <div className="space-y-5 pb-28">
    <PageHeader eyebrow="Home Handover" title="Prepare useful home information" subtitle="Build a private preview of selected appliance, boiler and property information for a future handover. Nothing is sent to anyone." backHref="/settings" backLabel="Settings" meta={<><span className="estate-chip">Private draft</span><span className="estate-chip">Explicit selection only</span></>} />

    {message ? <div role="status" className="rounded-[18px] border border-[#6f8e72]/15 bg-white/80 px-4 py-3 text-sm text-[#52705a]">{message}{message.includes("sign in again") ? <Link href="/login" className="ml-2 font-semibold underline">Sign in again</Link> : null}</div> : null}

    <section className="estate-sheet p-5"><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8efe5] text-[#52705a]"><UiIcon name="home" className="h-5 w-5" /></span><div><h2 className="font-serif text-xl">A safe foundation, not a transfer</h2><p className="mt-1 text-sm leading-6 text-[#667068]">DiaryDock records provenance and a minimal preview for each selected item. A home, household or address never grants access automatically. There is no recipient link or downloadable pack in this foundation.</p></div></div></section>

    {!draft && !loading ? <section className="estate-sheet p-5"><h2 className="font-serif text-xl">Start a private draft</h2><form onSubmit={createDraft} className="mt-4 flex flex-col gap-3 sm:flex-row"><label className="min-w-0 flex-1 text-xs font-semibold text-[#667068]">Draft name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} className="form-control" /></label><button disabled={busyKey === "create" || !name.trim()} className="min-h-12 self-end rounded-[15px] bg-[#315443] px-5 text-sm font-semibold text-white disabled:opacity-45">Create private draft</button></form></section> : null}

    {draft ? <>
      <section className="space-y-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#789078]">Draft</p><h2 className="font-serif text-2xl">{draft.name}</h2><p className="mt-1 text-sm text-[#667068]">Choose each item deliberately. Eligible property documents appear only when linked to an eligible home item.</p></div>
        <div className="estate-sheet divide-y divide-white/70 overflow-hidden">{candidates.length ? candidates.map((candidate) => { const key = `${candidate.type}:${candidate.id}`; const selected = selectedKeys.has(key); return <div key={key} className="flex items-center gap-3 px-4 py-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef2e9] text-[#52705a]"><UiIcon name={candidate.type === "DOCUMENT" ? "file" : "gear"} className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{candidate.label}</span><span className="block truncate text-xs text-[#667068]">{candidate.detail || "Property item"}</span></span><button disabled={Boolean(busyKey)} onClick={() => void toggleItem(candidate)} className={`min-h-10 rounded-xl px-3 text-xs font-semibold ${selected ? "bg-red-50 text-red-600" : "bg-[#315443] text-white"}`}>{selected ? "Remove" : "Add"}</button></div>; }) : <p className="p-5 text-sm leading-6 text-[#667068]">No eligible appliances, boilers or equipment are available yet. Add them under Physical Links first; personal documents are never offered here.</p>}</div>
      </section>

      <section className="estate-sheet p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-serif text-xl">Private preview</h2><p className="mt-1 text-sm text-[#667068]">{items.length} explicitly selected {items.length === 1 ? "item" : "items"}</p></div><span className="rounded-full bg-[#eef2e9] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#52705a]">Not shared</span></div>{items.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{items.map((item) => <article key={item.id} className="rounded-[20px] border border-[#315443]/10 bg-white/75 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#789078]">{item.resource_type === "ASSET" ? "Home item" : "Property document"}</p><h3 className="mt-2 font-semibold">{String(item.preview_snapshot.name ?? item.preview_snapshot.title ?? "Selected item")}</h3><p className="mt-1 text-xs leading-5 text-[#667068]">{[item.preview_snapshot.type, item.preview_snapshot.category, item.preview_snapshot.location, item.preview_snapshot.manufacturer, item.preview_snapshot.model].filter(Boolean).map(String).join(" · ") || "Only the minimal handover preview is stored."}</p></article>)}</div> : <p className="mt-4 rounded-2xl bg-white/65 p-4 text-sm text-[#667068]">Nothing selected. Your draft remains empty and private.</p>}</section>
    </> : null}

    <section className="estate-sheet p-5"><h2 className="font-serif text-xl">Always excluded</h2><p className="mt-1 text-sm leading-6 text-[#667068]">These categories are blocked by the handover data model, not merely hidden in the screen.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{exclusions.map((exclusion) => <div key={exclusion} className="flex items-center gap-2 rounded-2xl bg-white/65 px-3 py-3 text-xs font-semibold text-[#667068]"><UiIcon name="shield" className="h-4 w-4 shrink-0 text-[#52705a]" />{exclusion}</div>)}</div></section>
  </div>;
}

