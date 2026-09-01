"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

import { PageHeader } from "@/components/PageHeader";
import { UiIcon } from "@/components/UiIcon";

type Asset = {
  id: string;
  name: string;
  category: "APPLIANCE" | "BOILER" | "EQUIPMENT" | "OTHER";
  location: string;
  manufacturer: string;
  model: string;
  serial_number_masked: string;
  warranty_due_at: string | null;
  next_service_at: string | null;
};

type PhysicalLink = {
  id: string;
  name: string;
  resource_id: string;
  status: "ACTIVE" | "DISABLED" | "REVOKED" | "REPLACED";
  last_used_at: string | null;
  use_count: number;
};

type NewLink = { id: string; url: string };

const emptyDraft = { name: "", category: "APPLIANCE", location: "", manufacturer: "", model: "", serialNumber: "", warrantyDueAt: "", nextServiceAt: "", maintenanceNotes: "" };

export function PhysicalLinksWorkspace() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [links, setLinks] = useState<PhysicalLink[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [newLink, setNewLink] = useState<NewLink | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const assetsById = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);

  const refresh = async () => {
    const response = await fetch("/api/physical-links", { cache: "no-store" });
    const payload = await response.json() as { assets?: Asset[]; links?: PhysicalLink[]; error?: string };
    if (!response.ok) throw new Error(payload.error || "Physical Links could not be loaded.");
    setAssets(payload.assets ?? []);
    setLinks(payload.links ?? []);
  };

  useEffect(() => {
    void refresh().catch((error) => setMessage(error instanceof Error ? error.message : "Physical Links could not be loaded.")).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!newLink) { setQrDataUrl(""); return; }
    void QRCode.toDataURL(newLink.url, { width: 320, margin: 2, errorCorrectionLevel: "M", color: { dark: "#20352a", light: "#fffdf8" } }).then(setQrDataUrl).catch(() => setQrDataUrl(""));
  }, [newLink]);

  const request = async (body: Record<string, unknown>) => {
    const response = await fetch("/api/physical-links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json() as { asset?: Asset; link?: { id: string; path: string }; error?: string };
    if (!response.ok) throw new Error(payload.error || "That change could not be saved.");
    return payload;
  };

  const createAsset = async () => {
    setBusy(true); setMessage("");
    try {
      await request({ operation: "CREATE_ASSET", ...draft });
      setDraft(emptyDraft); setShowAssetForm(false); setMessage("Item saved. You can now make a private tag for it.");
      await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "That item could not be saved."); }
    finally { setBusy(false); }
  };

  const createOrReplace = async (operation: "CREATE_LINK" | "REPLACE_LINK", id: string, name?: string) => {
    setBusy(true); setMessage("");
    try {
      const payload = await request(operation === "CREATE_LINK" ? { operation, assetId: id, name } : { operation, linkId: id });
      if (payload.link) setNewLink({ id: payload.link.id, url: `${window.location.origin}${payload.link.path}` });
      setMessage(operation === "REPLACE_LINK" ? "The old tag is now unavailable. Save the new one below." : "Your private tag is ready. Save it now; DiaryDock does not store the secret.");
      await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "That link could not be created."); }
    finally { setBusy(false); }
  };

  const manage = async (linkId: string, action: "RENAME" | "DISABLE" | "ENABLE" | "REVOKE" | "REASSIGN", value?: string) => {
    setBusy(true); setMessage("");
    try {
      await request({ operation: "MANAGE_LINK", linkId, action, value });
      setMessage(action === "REVOKE" ? "That tag is permanently revoked." : "Physical Link updated.");
      await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "That link could not be updated."); }
    finally { setBusy(false); }
  };

  const writeNfc = async () => {
    if (!newLink) return;
    const Reader = (window as unknown as { NDEFReader?: new () => { write: (message: { records: { recordType: string; data: string }[] }) => Promise<void> } }).NDEFReader;
    if (!Reader) { setMessage("NFC writing is not available in this browser. You can use the QR code or copy the link instead."); return; }
    try { await new Reader().write({ records: [{ recordType: "url", data: newLink.url }] }); setMessage("The NFC tag was written successfully."); }
    catch { setMessage("The NFC tag was not written. Keep it close to the device and try again."); }
  };

  return (
    <main className="min-h-[100svh] bg-[#f5f1e8] px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))] text-[#20352a] sm:px-6">
      <div className="mx-auto max-w-5xl">
        <PageHeader eyebrow="Private smart labels" title="Physical Links" subtitle="Connect a QR code or NFC tag to an appliance or boiler without putting its private record ID on the label." backHref="/settings" action={<button type="button" onClick={() => setShowAssetForm((value) => !value)} className="hidden min-h-11 items-center gap-2 rounded-2xl bg-[#315443] px-4 text-sm font-semibold text-white sm:inline-flex"><UiIcon name="plus" className="h-4 w-4" />Add item</button>} />
        <button type="button" onClick={() => setShowAssetForm((value) => !value)} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#315443] px-4 text-sm font-semibold text-white sm:hidden"><UiIcon name="plus" className="h-4 w-4" />Add item</button>
        {message ? <p role="status" className="mt-4 rounded-2xl border border-[#6f8e72]/15 bg-white/80 px-4 py-3 text-sm text-[#52705a]">{message}</p> : null}

        {showAssetForm ? <section className="mt-5 rounded-[28px] border border-white/80 bg-white/85 p-5 shadow-sm"><h2 className="font-serif text-2xl">Add an item</h2><p className="mt-1 text-sm text-[#667068]">Start with the basics. More details can be added later.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><Field label="Name"><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Kitchen boiler" /></Field><Field label="Type"><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}><option value="APPLIANCE">Appliance</option><option value="BOILER">Boiler</option><option value="EQUIPMENT">Equipment</option><option value="OTHER">Other</option></select></Field><Field label="Location"><input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} placeholder="e.g. Utility room" /></Field><Field label="Maker and model"><div className="grid grid-cols-2 gap-2"><input value={draft.manufacturer} onChange={(event) => setDraft({ ...draft, manufacturer: event.target.value })} placeholder="Maker" /><input value={draft.model} onChange={(event) => setDraft({ ...draft, model: event.target.value })} placeholder="Model" /></div></Field><Field label="Serial number"><input value={draft.serialNumber} onChange={(event) => setDraft({ ...draft, serialNumber: event.target.value })} placeholder="Only the last four characters are saved" /></Field><Field label="Warranty ends"><input type="date" value={draft.warrantyDueAt} onChange={(event) => setDraft({ ...draft, warrantyDueAt: event.target.value })} /></Field></div><button type="button" disabled={busy || !draft.name.trim()} onClick={() => void createAsset()} className="mt-5 min-h-12 rounded-2xl bg-[#315443] px-5 text-sm font-semibold text-white disabled:opacity-40">Save item</button></section> : null}

        {newLink ? <section className="mt-5 grid gap-5 rounded-[30px] border-2 border-[#b89a5c]/35 bg-[#fffdf8] p-5 shadow-sm sm:grid-cols-[240px_minmax(0,1fr)] sm:p-6"><div className="flex min-h-60 items-center justify-center rounded-[22px] bg-white p-3">{qrDataUrl ? <Image src={qrDataUrl} alt="New DiaryDock Physical Link QR code" width={240} height={240} unoptimized /> : <span className="text-sm text-[#667068]">Preparing QR code…</span>}</div><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#789078]">Save this now</p><h2 className="mt-2 font-serif text-3xl">Your new private tag</h2><p className="mt-2 text-sm leading-6 text-[#667068]">For security, DiaryDock stores only a one-way verifier. This exact QR code and NFC payload cannot be shown again.</p><div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => void navigator.clipboard.writeText(newLink.url).then(() => setMessage("Private link copied."))} className="min-h-11 rounded-xl bg-[#315443] px-4 text-xs font-semibold text-white">Copy link</button>{qrDataUrl ? <a href={qrDataUrl} download="diarydock-physical-link.png" className="inline-flex min-h-11 items-center rounded-xl border border-[#315443]/15 px-4 text-xs font-semibold text-[#52705a]">Save QR</a> : null}<button type="button" onClick={() => void writeNfc()} className="min-h-11 rounded-xl border border-[#315443]/15 px-4 text-xs font-semibold text-[#52705a]">Write NFC tag</button><button type="button" onClick={() => setNewLink(null)} className="min-h-11 px-3 text-xs font-semibold text-[#667068]">Done</button></div></div></section> : null}

        <section className="mt-6"><h2 className="font-serif text-2xl">Your items</h2>{loading ? <p className="mt-3 rounded-2xl bg-white/75 p-5 text-sm text-[#667068]">Opening your items…</p> : assets.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{assets.map((asset) => <article key={asset.id} className="rounded-[24px] border border-white/85 bg-white/85 p-5 shadow-sm"><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8efe5] text-[#52705a]"><UiIcon name={asset.category === "BOILER" ? "home" : "gear"} className="h-5 w-5" /></span><div className="min-w-0"><h3 className="truncate font-semibold">{asset.name}</h3><p className="mt-1 text-xs text-[#667068]">{[asset.location, asset.manufacturer, asset.model].filter(Boolean).join(" · ") || "Details can be added later"}</p></div></div><div className="mt-4 flex gap-2"><Link href={`/assets/${asset.id}`} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-[#315443]/15 text-xs font-semibold text-[#52705a]">Open</Link><button type="button" disabled={busy} onClick={() => void createOrReplace("CREATE_LINK", asset.id, `${asset.name} tag`)} className="min-h-11 flex-1 rounded-xl bg-[#315443] text-xs font-semibold text-white disabled:opacity-40">Make tag</button></div></article>)}</div> : <div className="mt-3 rounded-[24px] bg-white/80 p-6 text-center text-sm text-[#667068]">Add an appliance, boiler or item to make your first private tag.</div>}</section>

        {links.length ? <section className="mt-7"><h2 className="font-serif text-2xl">Your tags</h2><p className="mt-1 text-sm text-[#667068]">Existing secrets are never displayed again. Replace a tag if it is lost or damaged.</p><div className="mt-3 space-y-3">{links.map((link) => <article key={link.id} className="rounded-[22px] border border-white/85 bg-white/85 p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h3 className="font-semibold">{link.name}</h3><span className={`rounded-full px-2.5 py-1 text-[9px] font-bold tracking-[0.12em] ${link.status === "ACTIVE" ? "bg-[#e8efe5] text-[#52705a]" : "bg-slate-100 text-slate-500"}`}>{link.status}</span></div><p className="mt-1 text-xs text-[#667068]">{assetsById.get(link.resource_id)?.name || "Linked item"} · Used {link.use_count} {link.use_count === 1 ? "time" : "times"}{link.last_used_at ? ` · Last ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(link.last_used_at))}` : ""}</p></div><div className="flex flex-wrap gap-1.5">{link.status === "ACTIVE" ? <button disabled={busy} onClick={() => void manage(link.id, "DISABLE")} className="min-h-10 rounded-xl border border-[#315443]/12 px-3 text-xs font-semibold">Disable</button> : link.status === "DISABLED" ? <button disabled={busy} onClick={() => void manage(link.id, "ENABLE")} className="min-h-10 rounded-xl border border-[#315443]/12 px-3 text-xs font-semibold">Enable</button> : null}{(link.status === "ACTIVE" || link.status === "DISABLED") ? <><button disabled={busy} onClick={() => { const name = window.prompt("Name this tag", link.name); if (name) void manage(link.id, "RENAME", name); }} className="min-h-10 rounded-xl border border-[#315443]/12 px-3 text-xs font-semibold">Rename</button><select aria-label={`Reassign ${link.name}`} value={link.resource_id} onChange={(event) => void manage(link.id, "REASSIGN", event.target.value)} className="min-h-10 rounded-xl border border-[#315443]/12 bg-white px-2 text-xs font-semibold">{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select><button disabled={busy} onClick={() => void createOrReplace("REPLACE_LINK", link.id)} className="min-h-10 rounded-xl border border-[#315443]/12 px-3 text-xs font-semibold">Replace</button><button disabled={busy} onClick={() => { if (window.confirm("Permanently revoke this tag? It cannot be re-enabled.")) void manage(link.id, "REVOKE"); }} className="min-h-10 rounded-xl px-3 text-xs font-semibold text-[#a4473d]">Revoke</button></> : null}</div></div></article>)}</div></section> : null}
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-1.5 text-sm font-semibold text-[#20352a]"><span>{label}</span><span className="block [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-[#315443]/12 [&_input]:bg-[#f8f6f0] [&_input]:px-3 [&_input]:py-3 [&_input]:font-normal [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-[#315443]/12 [&_select]:bg-[#f8f6f0] [&_select]:px-3 [&_select]:py-3 [&_select]:font-normal">{children}</span></label>;
}
