import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { UiIcon } from "@/components/UiIcon";
import { requireUser } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Smart item" };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function AssetPage({ params }: { params: Promise<{ assetId: string }> }) {
  await requireUser();
  const { assetId } = await params;
  if (!uuidPattern.test(assetId)) notFound();
  const supabase = await getSupabaseServerClient();
  const { data: asset, error } = await supabase.from("assets").select("id, name, category, location, manufacturer, model, serial_number_masked, warranty_due_at, next_service_at, document_ids, service_history, maintenance_notes, visibility").eq("id", assetId).maybeSingle();
  if (error || !asset) notFound();
  const details = [
    ["Location", asset.location], ["Maker", asset.manufacturer], ["Model", asset.model], ["Serial", asset.serial_number_masked],
    ["Warranty", asset.warranty_due_at ? new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(new Date(asset.warranty_due_at)) : ""],
    ["Next service", asset.next_service_at ? new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(new Date(asset.next_service_at)) : ""]
  ].filter(([, value]) => Boolean(value));
  return <><main className="min-h-[100svh] bg-[#f5f1e8] px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))] text-[#20352a] sm:px-6"><div className="mx-auto max-w-3xl"><PageHeader eyebrow={String(asset.category).toLowerCase()} title={asset.name} subtitle="A private smart-item record opened through the usual DiaryDock permission check." backHref="/physical-links" /><section className="mt-5 rounded-[28px] border border-white/80 bg-white/85 p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8efe5] text-[#52705a]"><UiIcon name="gear" className="h-6 w-6" /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#789078]">Visibility</p><p className="mt-1 text-sm font-semibold">{asset.visibility === "PRIVATE" ? "Only you" : "Shared through your household permissions"}</p></div></div>{details.length ? <dl className="mt-5 grid gap-3 sm:grid-cols-2">{details.map(([label, value]) => <div key={label} className="rounded-2xl bg-[#f5f4ed] p-4"><dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#789078]">{label}</dt><dd className="mt-1 text-sm font-semibold">{value}</dd></div>)}</dl> : <p className="mt-5 text-sm leading-6 text-[#667068]">No extra details have been added yet.</p>}{asset.maintenance_notes ? <div className="mt-4 rounded-2xl bg-[#f5f4ed] p-4"><h2 className="text-sm font-semibold">Maintenance notes</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#667068]">{asset.maintenance_notes}</p></div> : null}<div className="mt-5 flex flex-wrap gap-2"><Link href="/physical-links" className="inline-flex min-h-11 items-center rounded-xl bg-[#315443] px-4 text-xs font-semibold text-white">Manage physical tags</Link><Link href="/capture" className="inline-flex min-h-11 items-center rounded-xl border border-[#315443]/15 px-4 text-xs font-semibold text-[#52705a]">Add a document</Link></div></section></div></main><BottomNav /></>;
}
