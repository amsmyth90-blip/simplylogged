"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";

import { BillsCard, fieldClass } from "@/components/bills/BillsUi";
import { GarageVehicleSectionNav } from "@/components/garage/GarageVehicleSectionNav";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { ModalShell } from "@/components/ModalShell";
import { UiIcon, type IconName } from "@/components/UiIcon";
import { openPrivateDocument, uploadPrivateDocument, validateDocumentFile } from "@/lib/document-storage";
import type { VaultDocument } from "@/lib/mock-data";
import { documentKind as fileKind, formatDate as sharedFormatDate, formatFileSize as fileSize } from "@/lib/presentation";
import type { ReceiptDocumentAnalysis } from "@/lib/receipt-document-analysis";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { upsertStructuredDocument } from "@/lib/structured-data";
import { latestMileage, vehicleDisplayName, type VehicleExpense, type VehicleRecord } from "@/lib/vehicle-records";

export type ReceiptsMode = "overview" | "all" | "new" | "detail";
type ExpenseCategory = VehicleExpense["category"];

const categories: ExpenseCategory[] = ["Service", "Fuel", "Repair", "Tyres", "Insurance", "Tax", "Breakdown", "Parking", "Other"];
const categoryIcons: Record<ExpenseCategory, IconName> = { Service: "gear", Fuel: "file", Repair: "gear", Tyres: "gear", Insurance: "shield", Tax: "calendar", Breakdown: "car", Parking: "map-pin", Other: "archive" };
const categoryColours: Record<ExpenseCategory, string> = { Service: "#17643c", Fuel: "#e5a91d", Repair: "#d45b43", Tyres: "#6e57c7", Insurance: "#5577bb", Tax: "#4b917d", Breakdown: "#c8882a", Parking: "#7656c2", Other: "#9aa09b" };

const emptyDraft = { title: "", provider: "", date: "", amount: "", category: "Other" as ExpenseCategory, mileage: "", paymentMethod: "", receiptNumber: "", notes: "", linkedServiceId: "" };

function money(value: number) { return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2 }).format(value); }
function formatDate(value: string) { return sharedFormatDate(value, "2-digit"); }
function monthLabel(value: string) { const date = new Date(`${value}-01T12:00:00`); return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(date); }
function numberOrNull(value: string) { if (!value.trim()) return null; const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
function audit(action: string) { return { id: crypto.randomUUID(), action, createdAt: new Date().toISOString() }; }

export function VehicleReceiptsWorkspace({ vehicleId, mode = "overview", receiptId }: { vehicleId: string; mode?: ReceiptsMode; receiptId?: string }) {
  const router = useRouter();
  const { state, hydrated, repositoryMode, updateState } = useDiaryDockData();
  const vehicle = state.vehicles.vehicles.find((item) => item.id === vehicleId);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "All">("All");
  const [newestFirst, setNewestFirst] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);

  const receiptExpenses = useMemo(() => vehicle?.expenses.filter((expense) => Boolean(expense.documentId)) ?? [], [vehicle]);
  const receipt = receiptId ? receiptExpenses.find((expense) => expense.id === receiptId) : undefined;
  const receiptDocument = receipt?.documentId ? state.vaultDocuments.find((document) => document.id === receipt.documentId) : undefined;

  if (!hydrated) return <div className="mx-auto max-w-[760px] rounded-[24px] bg-white/80 p-8 text-sm text-[#667068]">Opening Receipts…</div>;
  if (!vehicle) return <div className="mx-auto max-w-[760px]"><BillsCard><p className="text-sm font-semibold text-[#20352a]">Vehicle not found</p></BillsCard></div>;

  const name = vehicleDisplayName(vehicle);
  const mileage = latestMileage(vehicle)?.mileage ?? null;
  const base = `/garage/vehicles/${vehicle.id}/costs/receipts`;
  const now = new Date();
  const yearReceipts = receiptExpenses.filter((expense) => Number(expense.date.slice(0, 4)) === now.getFullYear());
  const monthReceipts = yearReceipts.filter((expense) => Number(expense.date.slice(5, 7)) === now.getMonth() + 1);
  const yearTotal = yearReceipts.reduce((sum, expense) => sum + expense.amount, 0);
  const activeMonths = new Set(yearReceipts.map((expense) => expense.date.slice(0, 7))).size;
  const averageMonth = activeMonths ? yearTotal / activeMonths : 0;
  const categoryTotals = categories.map((category) => ({ category, total: yearReceipts.filter((expense) => expense.category === category).reduce((sum, expense) => sum + expense.amount, 0) })).filter((item) => item.total > 0).sort((a, b) => b.total - a.total);
  const filtered = [...receiptExpenses].filter((expense) => categoryFilter === "All" || expense.category === categoryFilter).filter((expense) => `${expense.title} ${expense.provider} ${expense.receiptNumber ?? ""}`.toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => newestFirst ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
  const grouped = Array.from(filtered.reduce((map, expense) => { const key = expense.date.slice(0, 7); map.set(key, [...(map.get(key) ?? []), expense]); return map; }, new Map<string, VehicleExpense[]>()))
    .sort(([a], [b]) => newestFirst ? b.localeCompare(a) : a.localeCompare(b));

  const updateVehicle = (updater: (current: VehicleRecord) => VehicleRecord) => updateState((current) => ({ ...current, vehicles: { vehicles: current.vehicles.vehicles.map((item) => item.id === vehicle.id ? updater(item) : item) } }));

  const analyseReceipt = async (selected: File) => {
    const validation = validateDocumentFile(selected);
    if (validation) { setMessage(validation); return; }
    setFile(selected);
    setWorking(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("analysisMode", "receipt");
      form.append("files", selected);
      const response = await fetch("/api/capture/extract", { method: "POST", body: form });
      const payload = await response.json() as { receiptAnalysis?: ReceiptDocumentAnalysis; error?: string };
      if (!response.ok || !payload.receiptAnalysis) throw new Error(payload.error || "DiaryDock could not read this receipt.");
      const result = payload.receiptAnalysis;
      setDraft({ title: result.title || selected.name.replace(/\.[^.]+$/, ""), provider: result.merchant, date: result.date, amount: result.amount ? String(result.amount) : "", category: result.category, mileage: result.mileage?.toString() ?? "", paymentMethod: result.paymentMethod, receiptNumber: result.receiptNumber, notes: result.summary, linkedServiceId: "" });
      setMessage(result.reviewReasons.length ? "DiaryDock suggested these details. Check the highlighted information against the original before saving." : "Receipt read. Please check every detail before saving.");
    } catch (reason) {
      setDraft({ ...emptyDraft, title: selected.name.replace(/\.[^.]+$/, "") });
      setMessage(`${reason instanceof Error ? reason.message : "The receipt could not be read automatically."} Enter and check the details manually.`);
    } finally { setWorking(false); }
  };

  const saveNewReceipt = async (event: FormEvent) => {
    event.preventDefault();
    const amount = numberOrNull(draft.amount);
    if (!file || !draft.title.trim() || !draft.date || amount === null || amount < 0) { setMessage("Choose a receipt and add its title, date and total amount."); return; }
    setWorking(true);
    const documentId = crypto.randomUUID();
    const expenseId = crypto.randomUUID();
    try {
      const stored = repositoryMode === "supabase" ? await uploadPrivateDocument(file, documentId) : null;
      const document: VaultDocument = { id: documentId, title: draft.title.trim(), category: "Vehicle receipts", kind: fileKind(file), size: fileSize(file.size), updated: "Just now", storageBucket: stored?.bucket, storagePath: stored?.path, originalFileName: file.name, mimeType: file.type, roomId: "garage", roomName: "Garage", issuer: draft.provider.trim(), extractionSummary: draft.notes.trim(), reviewStatus: "reviewed", reviewedAt: "Just now" };
      const expense: VehicleExpense = { id: expenseId, category: draft.category, title: draft.title.trim(), provider: draft.provider.trim(), amount, date: draft.date, mileage: numberOrNull(draft.mileage), paymentMethod: draft.paymentMethod.trim(), receiptNumber: draft.receiptNumber.trim(), linkedServiceId: draft.linkedServiceId || undefined, documentId, notes: draft.notes.trim(), createdAt: new Date().toISOString() };
      updateState((current) => ({ ...current, vaultDocuments: [document, ...current.vaultDocuments.filter((item) => item.id !== documentId)], vehicles: { vehicles: current.vehicles.vehicles.map((item) => item.id !== vehicle.id ? item : { ...item, documentIds: item.documentIds.includes(documentId) ? item.documentIds : [documentId, ...item.documentIds], services: draft.linkedServiceId ? item.services.map((service) => service.id === draft.linkedServiceId ? { ...service, documentIds: service.documentIds.includes(documentId) ? service.documentIds : [documentId, ...service.documentIds] } : service) : item.services, expenses: [expense, ...item.expenses], audit: [audit(`Receipt added: ${expense.title}`), ...item.audit], updatedAt: new Date().toISOString() }) } }));
      await upsertStructuredDocument(document);
      router.push(`${base}/${expenseId}`);
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Unable to save this receipt."); setWorking(false); }
  };

  const openEdit = () => {
    if (!receipt) return;
    setDraft({ title: receipt.title, provider: receipt.provider, date: receipt.date, amount: String(receipt.amount), category: receipt.category, mileage: receipt.mileage?.toString() ?? "", paymentMethod: receipt.paymentMethod ?? "", receiptNumber: receipt.receiptNumber ?? "", notes: receipt.notes, linkedServiceId: receipt.linkedServiceId ?? "" });
    setMessage("");
    setEditing(true);
  };

  const saveEdit = (event: FormEvent) => {
    event.preventDefault();
    const amount = numberOrNull(draft.amount);
    if (!receipt || !draft.title.trim() || !draft.date || amount === null || amount < 0) { setMessage("Add the receipt title, date and total amount."); return; }
    updateVehicle((current) => ({ ...current, expenses: current.expenses.map((expense) => expense.id === receipt.id ? { ...expense, title: draft.title.trim(), provider: draft.provider.trim(), date: draft.date, amount, category: draft.category, mileage: numberOrNull(draft.mileage), paymentMethod: draft.paymentMethod.trim(), receiptNumber: draft.receiptNumber.trim(), notes: draft.notes.trim(), linkedServiceId: draft.linkedServiceId || undefined } : expense), audit: [audit(`Receipt updated: ${draft.title.trim()}`), ...current.audit], updatedAt: new Date().toISOString() }));
    setEditing(false);
  };

  const deleteReceipt = async () => {
    if (!receipt || !window.confirm(`Delete “${receipt.title}” and its stored receipt? This cannot be undone.`)) return;
    setWorking(true);
    try {
      if (receiptDocument?.storageBucket && receiptDocument.storagePath) {
        const client = getSupabaseBrowserClient();
        if (!client) throw new Error("Secure storage is not available.");
        const { error } = await client.storage.from(receiptDocument.storageBucket).remove([receiptDocument.storagePath]);
        if (error) throw new Error(error.message);
      }
      updateState((current) => ({ ...current, vaultDocuments: current.vaultDocuments.filter((document) => document.id !== receipt.documentId), vehicles: { vehicles: current.vehicles.vehicles.map((item) => item.id !== vehicle.id ? item : { ...item, documentIds: item.documentIds.filter((id) => id !== receipt.documentId), services: item.services.map((service) => ({ ...service, documentIds: service.documentIds.filter((id) => id !== receipt.documentId) })), expenses: item.expenses.filter((expense) => expense.id !== receipt.id), audit: [audit(`Receipt deleted: ${receipt.title}`), ...item.audit], updatedAt: new Date().toISOString() }) } }));
      router.push(base);
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Unable to delete this receipt."); setWorking(false); }
  };

  const replaceReceipt = async (event: ChangeEvent<HTMLInputElement>) => {
    const replacement = event.target.files?.[0];
    if (!replacement || !receipt || !receiptDocument) return;
    const validation = validateDocumentFile(replacement);
    if (validation) { setMessage(validation); return; }
    setWorking(true);
    const nextId = crypto.randomUUID();
    try {
      const stored = repositoryMode === "supabase" ? await uploadPrivateDocument(replacement, nextId) : null;
      const nextDocument: VaultDocument = { ...receiptDocument, id: nextId, kind: fileKind(replacement), size: fileSize(replacement.size), updated: "Just now", storageBucket: stored?.bucket, storagePath: stored?.path, originalFileName: replacement.name, mimeType: replacement.type, reviewStatus: "needs-review", reviewedAt: undefined, reviewReasons: ["The receipt file was replaced. Recheck the saved details against the new original."] };
      updateState((current) => ({ ...current, vaultDocuments: [nextDocument, ...current.vaultDocuments.filter((document) => document.id !== receiptDocument.id)], vehicles: { vehicles: current.vehicles.vehicles.map((item) => item.id !== vehicle.id ? item : { ...item, documentIds: [nextId, ...item.documentIds.filter((id) => id !== receiptDocument.id)], services: item.services.map((service) => ({ ...service, documentIds: service.documentIds.map((id) => id === receiptDocument.id ? nextId : id) })), expenses: item.expenses.map((expense) => expense.id === receipt.id ? { ...expense, documentId: nextId } : expense), audit: [audit(`Receipt document replaced: ${receipt.title}`), ...item.audit], updatedAt: new Date().toISOString() }) } }));
      await upsertStructuredDocument(nextDocument);
      if (receiptDocument.storageBucket && receiptDocument.storagePath) { const client = getSupabaseBrowserClient(); await client?.storage.from(receiptDocument.storageBucket).remove([receiptDocument.storagePath]); }
      setMessage("Receipt document replaced. Recheck the saved details against the new original.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Unable to replace this receipt."); }
    finally { setWorking(false); event.target.value = ""; }
  };

  const shareReceipt = async () => {
    if (!receipt) return;
    const text = `${receipt.title} · ${formatDate(receipt.date)} · ${money(receipt.amount)}`;
    if (navigator.share) await navigator.share({ title: `DiaryDock receipt: ${receipt.title}`, text });
    else { await navigator.clipboard.writeText(text); setMessage("Receipt summary copied. The private document was not shared."); }
  };

  if (mode === "new") return <Shell vehicle={vehicle} name={name} mileage={mileage} title="Add Receipt" backHref={base}><form onSubmit={saveNewReceipt} className="space-y-4"><BillsCard><label className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-[18px] border border-dashed border-[#6f8e72]/35 bg-[#faf9f4] px-4 text-center focus-within:ring-2 focus-within:ring-[#6f8e72]"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e8efe5] text-[#315d45]"><UiIcon name="camera" className="h-7 w-7" /></span><span className="mt-3 text-sm font-semibold text-[#20352a]">{file ? file.name : "Take a photo or select a file"}</span><span className="mt-1 text-[10px] text-[#667068]">PDF, JPG, PNG, WebP or HEIC · maximum 4 MB</span><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp,image/heic" capture="environment" onChange={(event) => { const selected = event.target.files?.[0]; if (selected) void analyseReceipt(selected); }} className="sr-only" /></label></BillsCard>{working ? <BillsCard className="bg-[linear-gradient(135deg,#edf3e9,#fffdf8)]"><div className="flex items-center gap-3"><UiIcon name="search" className="h-5 w-5 text-[#52705a]" /><div><p className="text-xs font-semibold text-[#20352a]">Reading receipt</p><p className="mt-1 text-[10px] text-[#667068]">DiaryDock is suggesting details for you to check.</p></div></div></BillsCard> : null}{message ? <p role="status" className="rounded-[16px] bg-[#f1ecdf] px-4 py-3 text-[11px] leading-5 text-[#806b45]">{message}</p> : null}<ReceiptForm draft={draft} setDraft={setDraft} services={vehicle.services} /><button type="submit" disabled={working || !file} className="min-h-12 w-full rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white disabled:opacity-50">{working ? "Please wait…" : "Check and save receipt"}</button></form></Shell>;

  if (mode === "detail") {
    if (!receipt) return <Shell vehicle={vehicle} name={name} mileage={mileage} title="Receipt Details" backHref={base}><BillsCard><Empty title="Receipt not found" detail="This receipt may have been removed or belongs to another vehicle." /></BillsCard></Shell>;
    const linkedService = vehicle.services.find((service) => service.id === receipt.linkedServiceId);
    return <Shell vehicle={vehicle} name={name} mileage={mileage} title="Receipt Details" backHref={base} action={<button type="button" onClick={openEdit} className="min-h-11 rounded-full px-3 text-xs font-semibold text-[#315d45]">Edit</button>}>{message ? <p role="status" className="rounded-[16px] bg-[#f1ecdf] px-4 py-3 text-[11px] leading-5 text-[#806b45]">{message}</p> : null}<BillsCard className="bg-[linear-gradient(135deg,#fffdf8,#f1f4ea)]"><div className="flex items-start gap-4"><span className="flex h-20 w-16 shrink-0 items-center justify-center rounded-[12px] bg-white text-[#52705a] shadow-sm"><UiIcon name="file" className="h-7 w-7" /></span><div className="min-w-0"><p className="text-base font-semibold text-[#20352a]">{receipt.title}</p><p className="mt-1 text-[11px] text-[#667068]">{receipt.provider || "Merchant not recorded"}</p><p className="mt-1 text-[11px] text-[#667068]">{formatDate(receipt.date)}</p><p className="mt-3 text-2xl font-semibold text-[#20352a]">{money(receipt.amount)}</p><span className="mt-2 inline-flex rounded-full bg-[#e5efdf] px-2.5 py-1 text-[9px] font-semibold text-[#45604d]">{receipt.category}</span></div></div></BillsCard><BillsCard><dl><Detail label="Payment method" value={receipt.paymentMethod || "Not recorded"} /><Detail label="Receipt number" value={receipt.receiptNumber || "Not recorded"} /><Detail label="Category" value={receipt.category} /><Detail label="Mileage" value={receipt.mileage ? `${receipt.mileage.toLocaleString("en-GB")} miles` : "Not recorded"} /><Detail label="Linked service" value={linkedService ? `${linkedService.title} · ${formatDate(linkedService.date)}` : "Not linked"} /><Detail label="Notes" value={receipt.notes || "No notes"} /></dl></BillsCard><BillsCard><SectionTitle title="Document" detail="The original receipt is stored privately" />{receiptDocument ? <div className="mt-4"><DocumentRow document={receiptDocument} vehicleId={vehicle.id} /></div> : <div className="mt-4"><Empty title="No receipt document" detail="This expense does not currently have an original file." /></div>}</BillsCard><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><button type="button" onClick={() => void shareReceipt()} className="min-h-[68px] rounded-[16px] border border-[#20352a]/[0.07] bg-white text-xs font-semibold text-[#45604d]">Share summary</button><button type="button" onClick={() => void openPrivateDocument(receiptDocument?.storageBucket, receiptDocument?.storagePath).catch((reason) => setMessage(reason instanceof Error ? reason.message : "Unable to open the document."))} className="min-h-[68px] rounded-[16px] border border-[#20352a]/[0.07] bg-white text-xs font-semibold text-[#45604d]">Open document</button><label className="flex min-h-[68px] cursor-pointer items-center justify-center rounded-[16px] border border-[#20352a]/[0.07] bg-white text-center text-xs font-semibold text-[#45604d]">{working ? "Replacing…" : "Replace"}<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp,image/heic" onChange={(event) => void replaceReceipt(event)} className="sr-only" /></label><button type="button" onClick={() => void deleteReceipt()} className="min-h-[68px] rounded-[16px] border border-[#d56b5c]/20 bg-[#fff7f5] text-xs font-semibold text-[#a4473d]">Delete</button></div><ModalShell open={editing} title="Edit receipt" subtitle="Check changes against the original receipt." onClose={() => setEditing(false)}><form onSubmit={saveEdit} className="space-y-4">{message ? <p role="alert" className="rounded-[12px] bg-[#fbe5df] p-3 text-xs text-[#a4473d]">{message}</p> : null}<ReceiptForm draft={draft} setDraft={setDraft} services={vehicle.services} /><button type="submit" className="min-h-12 w-full rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white">Save changes</button></form></ModalShell></Shell>;
  }

  if (mode === "all") return <Shell vehicle={vehicle} name={name} mileage={mileage} title="All Receipts" backHref={base} action={<Link href={`${base}/new`} className="flex min-h-11 items-center rounded-full bg-[#eef3e9] px-3 text-[11px] font-semibold text-[#315d45]">+ Add</Link>}><BillsCard><label className="relative block"><UiIcon name="search" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#667068]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search receipts" className={`${fieldClass} !mt-0 pl-10`} /></label><div className="mt-3 grid grid-cols-2 gap-2"><label className="text-xs font-semibold text-[#667068]">Category<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as ExpenseCategory | "All")} className={fieldClass}><option value="All">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><button type="button" onClick={() => setNewestFirst((value) => !value)} className="mt-[18px] min-h-11 rounded-[14px] border border-[#20352a]/10 bg-[#faf9f4] text-xs font-semibold text-[#45604d]">{newestFirst ? "Newest first" : "Oldest first"}</button></div></BillsCard>{grouped.length ? <div className="space-y-4">{grouped.map(([month, expenses]) => <section key={month}><div className="mb-2 flex items-center justify-between px-1"><h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#315d45]">{monthLabel(month)}</h2><span className="text-[11px] font-semibold text-[#315d45]">{money(expenses.reduce((sum, expense) => sum + expense.amount, 0))}</span></div><BillsCard className="!p-2"><div className="space-y-1">{expenses.map((expense) => <ReceiptRow key={expense.id} expense={expense} href={`${base}/${expense.id}`} />)}</div></BillsCard></section>)}</div> : <BillsCard><Empty title="No matching receipts" detail="Change the search or category, or add a new receipt." /></BillsCard>}<Link href={`${base}/new`} className="flex min-h-12 items-center justify-center gap-2 rounded-[15px] bg-[#2f5140] text-sm font-semibold text-white"><UiIcon name="plus" className="h-4 w-4" />Add receipt</Link></Shell>;

  return <Shell vehicle={vehicle} name={name} mileage={mileage} title="Receipts" backHref={`/garage/vehicles/${vehicle.id}/costs`} action={<Link href={`${base}/new`} className="flex min-h-11 items-center rounded-full bg-[#eef3e9] px-3 text-[11px] font-semibold text-[#315d45]">+ Add Receipt</Link>}><div className="grid grid-cols-2 gap-3"><Metric label="Total receipts" value={money(yearTotal)} helper="This year" /><Metric label="Average per month" value={money(averageMonth)} helper={activeMonths ? `${activeMonths} recorded month${activeMonths === 1 ? "" : "s"}` : "No receipt history"} /></div><BillsCard><SectionTitle title="Top categories this year" detail="Only expenses with an attached receipt are included" />{categoryTotals.length ? <div className="mt-4 space-y-3">{categoryTotals.slice(0, 6).map((item) => <div key={item.category} className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: categoryColours[item.category] }} /><span className="flex-1 text-xs font-semibold text-[#20352a]">{item.category}</span><span className="text-xs font-semibold text-[#20352a]">{money(item.total)}</span><span className="w-9 text-right text-[10px] text-[#667068]">{yearTotal ? Math.round((item.total / yearTotal) * 100) : 0}%</span></div>)}</div> : <div className="mt-4"><Empty title="No receipt totals yet" detail="Add a receipt to begin the summary." /></div>}</BillsCard><BillsCard><SectionTitle title="Recent receipts" detail={`${monthReceipts.length} added this month`} action={<Link href={`${base}/all`} className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-[#45604d]">View all</Link>} /><div className="mt-4 space-y-2">{[...receiptExpenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((expense) => <ReceiptRow key={expense.id} expense={expense} href={`${base}/${expense.id}`} />)}{!receiptExpenses.length ? <Empty title="No receipts saved" detail="Take a photo or choose a file to add your first vehicle receipt." /> : null}</div></BillsCard><Link href={`${base}/all`} className="flex min-h-12 items-center justify-center rounded-[15px] bg-[#2f5140] text-sm font-semibold text-white">View all receipts</Link></Shell>;
}

function Shell({ vehicle, name, mileage, title, backHref, action, children }: { vehicle: VehicleRecord; name: string; mileage: number | null; title: string; backHref: string; action?: ReactNode; children: ReactNode }) { return <div className="mx-auto w-full max-w-[760px] space-y-4 pb-28"><header className="flex min-h-14 items-center rounded-[20px] border border-[#20352a]/[0.07] bg-white/90 px-2.5 shadow-sm"><Link href={backHref} aria-label="Go back" className="flex h-11 w-11 items-center justify-center rounded-full text-[#20352a]"><UiIcon name="arrow-left" className="h-5 w-5" /></Link><h1 className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-[#20352a]">{title}</h1>{action ?? <span className="h-11 w-11" />}</header><GarageVehicleSectionNav vehicleId={vehicle.id} /><VehicleSummary vehicle={vehicle} name={name} mileage={mileage} />{children}<p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[11px] leading-5 text-[#667068]">Receipt details and extracted suggestions must be checked against the original. DiaryDock does not confirm purchases, tax treatment or reimbursement eligibility.</p></div>; }
function VehicleSummary({ vehicle, name, mileage }: { vehicle: VehicleRecord; name: string; mileage: number | null }) { return <section className="flex min-h-[92px] items-center gap-4 rounded-[22px] border border-[#20352a]/[0.08] bg-[#fffdf8] p-3 shadow-sm"><span className="flex h-[68px] w-[92px] shrink-0 items-center justify-center rounded-[16px] bg-[#e8ede3] text-[#526b52]"><UiIcon name="car" className="h-9 w-9" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#20352a]">{name}</p><p className="mt-1 truncate text-[11px] text-[#667068]">{[vehicle.registration || "No registration", vehicle.year?.toString(), vehicle.fuelType, mileage === null ? "Mileage not recorded" : `${mileage.toLocaleString("en-GB")} miles`].filter(Boolean).join(" · ")}</p></div></section>; }
function ReceiptForm({ draft, setDraft, services }: { draft: typeof emptyDraft; setDraft: React.Dispatch<React.SetStateAction<typeof emptyDraft>>; services: VehicleRecord["services"] }) { return <BillsCard><SectionTitle title="Check receipt details" detail="Correct anything the document reader has suggested" /><div className="mt-4 space-y-4"><Field label="Receipt title" value={draft.title} onChange={(value) => setDraft((current) => ({ ...current, title: value }))} /><Field label="Merchant" value={draft.provider} onChange={(value) => setDraft((current) => ({ ...current, provider: value }))} /><div className="grid grid-cols-2 gap-3"><Field label="Date" type="date" value={draft.date} onChange={(value) => setDraft((current) => ({ ...current, date: value }))} /><Field label="Amount" type="number" value={draft.amount} onChange={(value) => setDraft((current) => ({ ...current, amount: value }))} /></div><label className="block text-xs font-semibold text-[#667068]">Category<select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value as ExpenseCategory }))} className={fieldClass}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><Field label="Mileage" type="number" value={draft.mileage} onChange={(value) => setDraft((current) => ({ ...current, mileage: value }))} /><Field label="Payment method" value={draft.paymentMethod} onChange={(value) => setDraft((current) => ({ ...current, paymentMethod: value }))} /></div><Field label="Receipt number" value={draft.receiptNumber} onChange={(value) => setDraft((current) => ({ ...current, receiptNumber: value }))} /><label className="block text-xs font-semibold text-[#667068]">Link to service or repair (optional)<select value={draft.linkedServiceId} onChange={(event) => setDraft((current) => ({ ...current, linkedServiceId: event.target.value }))} className={fieldClass}><option value="">Not linked</option>{services.map((service) => <option key={service.id} value={service.id}>{formatDate(service.date)} · {service.title}</option>)}</select></label><Area label="Notes" value={draft.notes} onChange={(value) => setDraft((current) => ({ ...current, notes: value }))} /></div></BillsCard>; }
function ReceiptRow({ expense, href }: { expense: VehicleExpense; href: string }) { return <Link href={href} className="flex min-h-[72px] items-center gap-3 rounded-[16px] border border-[#20352a]/[0.06] bg-[#faf9f4] px-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white text-[#52705a]"><UiIcon name={categoryIcons[expense.category]} className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-[#20352a]">{expense.title}</span><span className="mt-1 block truncate text-[10px] text-[#667068]">{expense.provider || "Merchant not recorded"} · {formatDate(expense.date)}{expense.mileage ? ` · ${expense.mileage.toLocaleString("en-GB")} miles` : ""}</span></span><span className="text-xs font-semibold text-[#20352a]">{money(expense.amount)}</span><UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" /></Link>; }
function DocumentRow({ document, vehicleId }: { document: VaultDocument; vehicleId: string }) { return <Link href={`/document/${document.id}?from=vehicle&vehicleId=${vehicleId}`} className="flex min-h-[70px] items-center gap-3 rounded-[17px] border border-[#20352a]/[0.07] bg-[#faf9f4] px-3"><UiIcon name="file" className="h-5 w-5 text-[#52705a]" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-[#20352a]">{document.title}</span><span className="text-[10px] text-[#667068]">{document.kind} · {document.size}</span></span><UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" /></Link>; }
function Metric({ label, value, helper }: { label: string; value: string; helper: string }) { return <BillsCard className="!p-4"><p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#667068]">{label}</p><p className="mt-2 text-lg font-semibold text-[#20352a]">{value}</p><p className="mt-1 text-[9px] text-[#315d45]">{helper}</p></BillsCard>; }
function SectionTitle({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) { return <div className="flex items-start justify-between gap-3"><div><h2 className="text-[15px] font-semibold text-[#20352a]">{title}</h2><p className="mt-1 text-[11px] leading-5 text-[#667068]">{detail}</p></div>{action}</div>; }
function Detail({ label, value }: { label: string; value: string }) { return <div className="flex min-h-11 items-center justify-between gap-4 border-b border-[#20352a]/[0.06] py-2.5 last:border-0"><dt className="text-xs text-[#667068]">{label}</dt><dd className="max-w-[60%] text-right text-xs font-semibold text-[#20352a]">{value}</dd></div>; }
function Empty({ title, detail }: { title: string; detail: string }) { return <div className="rounded-[18px] border border-dashed border-[#6f8e72]/35 bg-[#f7f7f1] px-5 py-8 text-center"><UiIcon name="file" className="mx-auto h-6 w-6 text-[#6f8e72]" /><p className="mt-3 text-sm font-semibold text-[#20352a]">{title}</p><p className="mt-1 text-[11px] leading-5 text-[#667068]">{detail}</p></div>; }
function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: "text" | "date" | "number" }) { return <label className="block text-xs font-semibold text-[#667068]">{label}<input type={type} min={type === "number" ? "0" : undefined} step={type === "number" ? "any" : undefined} value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass} /></label>; }
function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-xs font-semibold text-[#667068]">{label}<textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} className={`${fieldClass} resize-y`} /></label>; }
