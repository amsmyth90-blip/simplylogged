"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";

import { BillsCard, fieldClass } from "@/components/bills/BillsUi";
import { GarageVehicleSectionNav } from "@/components/garage/GarageVehicleSectionNav";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { ModalShell } from "@/components/ModalShell";
import { UiIcon, type IconName } from "@/components/UiIcon";
import type { Reminder, VaultDocument } from "@/lib/mock-data";
import { latestMileage, vehicleDisplayName, type VehicleRecord, type VehicleServiceEntry, type VehicleServiceKind } from "@/lib/vehicle-records";

export type ServiceRecordsView = "overview" | "history" | "maintenance" | "reminders";

type Dialog = "service" | "reminder" | null;

const emptyServiceDraft = {
  kind: "service" as Exclude<VehicleServiceKind, "repair">,
  title: "",
  provider: "",
  date: "",
  mileage: "",
  cost: "",
  paymentMethod: "",
  workItems: "",
  notes: "",
  nextServiceDate: "",
  nextServiceMileage: "",
  documentIds: [] as string[],
};

const emptyReminderDraft = { title: "", dueDate: "", note: "" };

function formatDate(value: string) {
  if (!value) return "Not recorded";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatMoney(value: number | null) {
  return value === null ? "Not recorded" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2 }).format(value);
}

function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function daysUntil(value: string) {
  if (!value) return null;
  const timestamp = new Date(`${value}T12:00:00`).getTime();
  return Number.isNaN(timestamp) ? null : Math.ceil((timestamp - Date.now()) / 86_400_000);
}

function audit(action: string) {
  return { id: crypto.randomUUID(), action, createdAt: new Date().toISOString() };
}

function cleanWorkItems(value: string) {
  return value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
}

export function VehicleServiceRecordsWorkspace({ vehicleId, view = "overview", serviceId }: { vehicleId: string; view?: ServiceRecordsView; serviceId?: string }) {
  const { state, hydrated, updateState } = useDiaryDockData();
  const vehicle = state.vehicles.vehicles.find((item) => item.id === vehicleId);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [serviceDraft, setServiceDraft] = useState(emptyServiceDraft);
  const [reminderDraft, setReminderDraft] = useState(emptyReminderDraft);
  const [historyFilter, setHistoryFilter] = useState<"all" | "service" | "inspection">("all");
  const [historyAscending, setHistoryAscending] = useState(false);
  const [exporting, setExporting] = useState(false);

  const vehicleDocuments = useMemo(() => {
    if (!vehicle) return [];
    const linked = new Set(vehicle.documentIds);
    return state.vaultDocuments.filter((document) => linked.has(document.id) && document.kind !== "Image");
  }, [state.vaultDocuments, vehicle]);

  if (!hydrated) return <div className="mx-auto max-w-[760px] rounded-[24px] bg-white/80 p-8 text-sm text-[#667068]">Opening Service Records…</div>;
  if (!vehicle) return <div className="mx-auto max-w-[760px]"><BillsCard><p className="text-sm font-semibold text-[#20352a]">Vehicle not found</p><Link href="/room/garage" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#45604d]">Back to Garage</Link></BillsCard></div>;

  const vehicleName = vehicleDisplayName(vehicle);
  const mileage = latestMileage(vehicle)?.mileage ?? null;
  const serviceRecords = vehicle.services.filter((entry) => entry.kind !== "repair");
  const repairRecords = vehicle.services.filter((entry) => entry.kind === "repair");
  const serviceRecord = serviceId ? vehicle.services.find((entry) => entry.id === serviceId && entry.kind !== "repair") : undefined;
  const lastService = [...serviceRecords].sort((a, b) => b.date.localeCompare(a.date))[0];
  const totalSpent = serviceRecords.reduce((sum, entry) => sum + (entry.cost ?? 0), 0);
  const recentProvider = lastService?.provider || "Not recorded";
  const dueDays = daysUntil(vehicle.nextServiceDate);
  const mileageRemaining = vehicle.nextServiceMileage !== null && mileage !== null ? vehicle.nextServiceMileage - mileage : null;
  const serviceHealth = !serviceRecords.length ? { label: "Start your history", detail: "Add your first confirmed service record.", tone: "bg-[#f2efe5] text-[#806b45]" } : (dueDays !== null && dueDays < 0) || (mileageRemaining !== null && mileageRemaining < 0) ? { label: "Needs attention", detail: "A recorded service date or mileage has passed.", tone: "bg-[#fbe5df] text-[#a4473d]" } : { label: "On track", detail: "Your recorded service history and next-service details are up to date.", tone: "bg-[#e9f0e4] text-[#45604d]" };
  const serviceReminders = state.reminders.filter((reminder) => reminder.roomId === "garage" && reminder.group !== "done" && /service|maintenance|tyre|brake|battery|oil|wiper/i.test(`${reminder.title} ${reminder.note ?? ""}`));
  const base = `/garage/vehicles/${vehicle.id}/servicing`;
  const views: { id: ServiceRecordsView; label: string; href: string }[] = [
    { id: "overview", label: "Overview", href: base },
    { id: "history", label: "History", href: `${base}?view=history` },
    { id: "maintenance", label: "Maintenance", href: `${base}?view=maintenance` },
    { id: "reminders", label: "Reminders", href: `${base}?view=reminders` },
  ];

  const updateVehicle = (updater: (current: VehicleRecord) => VehicleRecord) => {
    updateState((current) => ({ ...current, vehicles: { vehicles: current.vehicles.vehicles.map((item) => item.id === vehicle.id ? updater(item) : item) } }));
  };

  const openNewService = (kind: Exclude<VehicleServiceKind, "repair"> = "service") => {
    setEditingId(null);
    setServiceDraft({ ...emptyServiceDraft, kind, nextServiceDate: vehicle.nextServiceDate, nextServiceMileage: vehicle.nextServiceMileage?.toString() ?? "" });
    setMessage("");
    setDialog("service");
  };

  const openEditService = (entry: VehicleServiceEntry) => {
    setEditingId(entry.id);
    setServiceDraft({ kind: entry.kind === "inspection" ? "inspection" : "service", title: entry.title, provider: entry.provider, date: entry.date, mileage: entry.mileage?.toString() ?? "", cost: entry.cost?.toString() ?? "", paymentMethod: entry.paymentMethod ?? "", workItems: (entry.workItems ?? []).join("\n"), notes: entry.notes, nextServiceDate: entry.nextServiceDate || vehicle.nextServiceDate, nextServiceMileage: (entry.nextServiceMileage ?? vehicle.nextServiceMileage)?.toString() ?? "", documentIds: [...entry.documentIds] });
    setMessage("");
    setDialog("service");
  };

  const duplicateService = (entry: VehicleServiceEntry) => {
    setEditingId(null);
    setServiceDraft({ kind: entry.kind === "inspection" ? "inspection" : "service", title: entry.title, provider: entry.provider, date: "", mileage: "", cost: "", paymentMethod: entry.paymentMethod ?? "", workItems: (entry.workItems ?? []).join("\n"), notes: entry.notes, nextServiceDate: "", nextServiceMileage: "", documentIds: [] });
    setMessage("Check the copied details, then add the new date and mileage.");
    setDialog("service");
  };

  const saveService = (event: FormEvent) => {
    event.preventDefault();
    if (!serviceDraft.title.trim() || !serviceDraft.date) { setMessage("Add a service title and date."); return; }
    const existing = vehicle.services.find((entry) => entry.id === editingId);
    const entry: VehicleServiceEntry = { id: editingId ?? crypto.randomUUID(), kind: serviceDraft.kind, title: serviceDraft.title.trim(), provider: serviceDraft.provider.trim(), date: serviceDraft.date, mileage: numberOrNull(serviceDraft.mileage), cost: numberOrNull(serviceDraft.cost), paymentMethod: serviceDraft.paymentMethod.trim(), workItems: cleanWorkItems(serviceDraft.workItems), notes: serviceDraft.notes.trim(), nextServiceDate: serviceDraft.nextServiceDate, nextServiceMileage: numberOrNull(serviceDraft.nextServiceMileage), documentIds: serviceDraft.documentIds, createdAt: existing?.createdAt ?? new Date().toISOString() };
    updateVehicle((current) => ({ ...current, nextServiceDate: serviceDraft.nextServiceDate || current.nextServiceDate, nextServiceMileage: numberOrNull(serviceDraft.nextServiceMileage) ?? current.nextServiceMileage, services: editingId ? current.services.map((item) => item.id === editingId ? entry : item) : [entry, ...current.services], audit: [audit(`${editingId ? "Updated" : "Added"} ${entry.kind === "inspection" ? "maintenance" : "service"} record: ${entry.title}`), ...current.audit], updatedAt: new Date().toISOString() }));
    setServiceDraft(emptyServiceDraft);
    setEditingId(null);
    setMessage("");
    setDialog(null);
  };

  const saveReminder = (event: FormEvent) => {
    event.preventDefault();
    if (!reminderDraft.title.trim() || !reminderDraft.dueDate) { setMessage("Add a reminder title and due date."); return; }
    const reminder: Reminder = { id: crypto.randomUUID(), title: reminderDraft.title.trim(), note: reminderDraft.note.trim(), roomId: "garage", roomName: "Garage", group: "later", timeLabel: formatDate(reminderDraft.dueDate), dueDate: reminderDraft.dueDate, priority: "normal" };
    updateState((current) => ({ ...current, reminders: [reminder, ...current.reminders] }));
    setReminderDraft(emptyReminderDraft);
    setMessage("");
    setDialog(null);
  };

  const toggleDocument = (documentId: string) => setServiceDraft((draft) => ({ ...draft, documentIds: draft.documentIds.includes(documentId) ? draft.documentIds.filter((id) => id !== documentId) : [...draft.documentIds, documentId] }));

  const downloadSummary = async () => {
    setExporting(true);
    try {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
      const pdf = await PDFDocument.create();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
      let page = pdf.addPage([595, 842]);
      let y = 790;
      const draw = (text: string, size = 10, isBold = false) => { if (y < 55) { page = pdf.addPage([595, 842]); y = 790; } page.drawText(text.slice(0, 90), { x: 48, y, size, font: isBold ? bold : font, color: rgb(0.13, 0.21, 0.16) }); y -= size + 8; };
      draw("DiaryDock Service History", 18, true);
      draw(`${vehicleName}${vehicle.registration ? ` · ${vehicle.registration}` : ""}`, 12, true);
      draw(`Generated ${new Intl.DateTimeFormat("en-GB").format(new Date())}`, 9);
      y -= 10;
      [...serviceRecords].sort((a, b) => b.date.localeCompare(a.date)).forEach((entry) => { draw(`${formatDate(entry.date)} · ${entry.title}`, 11, true); draw([entry.provider, entry.mileage !== null ? `${entry.mileage.toLocaleString("en-GB")} miles` : "", entry.cost !== null ? formatMoney(entry.cost) : ""].filter(Boolean).join(" · "), 9); (entry.workItems ?? []).forEach((item) => draw(`• ${item}`, 9)); if (entry.notes) draw(entry.notes, 9); y -= 8; });
      if (!serviceRecords.length) draw("No service records have been added.", 10);
      const bytes = await pdf.save();
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${vehicleName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-service-history.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  };

  if (serviceId) {
    if (!serviceRecord) return <div className="mx-auto w-full max-w-[760px] space-y-4 pb-28"><ServiceHeader title="Service Details" backHref={base} /><BillsCard><Empty icon="gear" title="Service record not found" detail="This record may have been removed or may belong to another vehicle." /></BillsCard></div>;
    const linkedDocuments = serviceRecord.documentIds.map((id) => state.vaultDocuments.find((document) => document.id === id)).filter((document): document is VaultDocument => Boolean(document));
    return <div className="mx-auto w-full max-w-[760px] space-y-4 pb-28"><ServiceHeader title="Service Details" backHref={base} action={<button type="button" onClick={() => openEditService(serviceRecord)} className="min-h-11 rounded-full px-3 text-xs font-semibold text-[#315d45]">Edit</button>} /><GarageVehicleSectionNav vehicleId={vehicle.id} /><VehicleSummary vehicle={vehicle} name={vehicleName} mileage={mileage} /><div className="grid grid-cols-2 gap-3"><InfoTile label="Service date" value={formatDate(serviceRecord.date)} /><InfoTile label="Mileage" value={serviceRecord.mileage === null ? "Not recorded" : `${serviceRecord.mileage.toLocaleString("en-GB")} miles`} /><InfoTile label="Service type" value={serviceRecord.title} /><InfoTile label="Service provider" value={serviceRecord.provider || "Not recorded"} /><InfoTile label="Cost" value={formatMoney(serviceRecord.cost)} /><InfoTile label="Payment method" value={serviceRecord.paymentMethod || "Not recorded"} /></div><BillsCard><SectionTitle title="Work carried out" detail="Items recorded for this service" /><div className="mt-4 space-y-2">{(serviceRecord.workItems ?? []).length ? (serviceRecord.workItems ?? []).map((item) => <div key={item} className="flex min-h-11 items-center gap-3 text-xs text-[#20352a]"><UiIcon name="check" className="h-4 w-4 shrink-0 text-[#52705a]" />{item}</div>) : <p className="text-[11px] leading-5 text-[#667068]">No individual work items have been added.</p>}</div></BillsCard><BillsCard><SectionTitle title="Next service" detail="The date and mileage recorded after this service" /><div className="mt-4 grid grid-cols-2 gap-3"><InfoTile label="Date" value={formatDate(serviceRecord.nextServiceDate || vehicle.nextServiceDate)} /><InfoTile label="Mileage" value={(serviceRecord.nextServiceMileage ?? vehicle.nextServiceMileage) === null ? "Not recorded" : `${(serviceRecord.nextServiceMileage ?? vehicle.nextServiceMileage)?.toLocaleString("en-GB")} miles`} /></div></BillsCard><BillsCard><SectionTitle title="Documents" detail="Invoices and reports securely linked to this service" /><div className="mt-4 space-y-2">{linkedDocuments.length ? linkedDocuments.map((document) => <DocumentRow key={document.id} document={document} vehicleId={vehicle.id} />) : <Empty icon="file" title="No documents linked" detail="Edit this service to link an invoice or service report." />}</div></BillsCard><BillsCard><SectionTitle title="Notes" detail="Additional information about this service" /><p className="mt-4 whitespace-pre-wrap text-[12px] leading-5 text-[#667068]">{serviceRecord.notes || "No notes added."}</p></BillsCard><button type="button" onClick={() => openEditService(serviceRecord)} className="min-h-12 w-full rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white">Edit service record</button><button type="button" onClick={() => duplicateService(serviceRecord)} className="min-h-12 w-full rounded-[15px] border border-[#6f8e72]/35 bg-white px-4 text-sm font-semibold text-[#45604d]">Duplicate service</button><ServiceModal open={dialog === "service"} title={editingId ? "Edit service" : "Duplicate service"} message={message} close={() => setDialog(null)} draft={serviceDraft} setDraft={setServiceDraft} save={saveService} documents={vehicleDocuments} toggleDocument={toggleDocument} /></div>;
  }

  const filteredHistory = [...serviceRecords].filter((entry) => historyFilter === "all" || entry.kind === historyFilter).sort((a, b) => historyAscending ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));

  return <div className="mx-auto w-full max-w-[760px] space-y-4 pb-28">
    <ServiceHeader title="Service Records" backHref="/room/garage" action={<button type="button" onClick={() => openNewService("service")} className="min-h-11 rounded-full bg-[#eef3e9] px-3 text-[11px] font-semibold text-[#315d45]">+ Add Service</button>} />
    <GarageVehicleSectionNav vehicleId={vehicle.id} />
    <nav aria-label="Service record views" className="rounded-[18px] border border-[#20352a]/[0.07] bg-white p-1.5 shadow-sm"><div className="grid grid-cols-4 gap-1">{views.map((item) => <Link key={item.id} href={item.href} aria-current={view === item.id ? "page" : undefined} className={`flex min-h-11 items-center justify-center rounded-[12px] px-1 text-center text-[9px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] sm:text-[10px] ${view === item.id ? "bg-[#355540] text-white" : "text-[#667068] hover:bg-[#eef2e9]"}`}>{item.label}</Link>)}</div></nav>
    <VehicleSummary vehicle={vehicle} name={vehicleName} mileage={mileage} />

    {view === "overview" ? <div className="space-y-4">
      <BillsCard className="bg-[linear-gradient(135deg,#edf3e9,#fffdf8)]"><div className="flex items-start gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#52705a]"><UiIcon name="gear" className="h-6 w-6" /></span><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6f8e72]">Next service due</p><p className="mt-1 text-lg font-semibold text-[#20352a]">{formatDate(vehicle.nextServiceDate)}</p><p className={`mt-1 text-[11px] font-semibold ${dueDays !== null && dueDays < 0 ? "text-[#a4473d]" : "text-[#315d45]"}`}>{dueDays === null ? "Add a date or mileage" : dueDays < 0 ? `${Math.abs(dueDays)} days overdue` : `in ${dueDays} days`}</p></div></div><div className="mt-4 grid grid-cols-2 gap-3"><InfoTile label="Due at" value={vehicle.nextServiceMileage === null ? "Not recorded" : `${vehicle.nextServiceMileage.toLocaleString("en-GB")} miles`} /><InfoTile label="Mileage remaining" value={mileageRemaining === null ? "Not recorded" : mileageRemaining < 0 ? `${Math.abs(mileageRemaining).toLocaleString("en-GB")} miles overdue` : `${mileageRemaining.toLocaleString("en-GB")} miles`} /></div></BillsCard>
      <BillsCard><SectionTitle title="Service summary" detail="Based on the records saved in DiaryDock" /><div className="mt-4 grid grid-cols-2 gap-3"><InfoTile label="Total spent" value={formatMoney(totalSpent)} /><InfoTile label="Records" value={`${serviceRecords.length}`} /><InfoTile label="Last service mileage" value={lastService?.mileage === null || !lastService ? "Not recorded" : `${lastService.mileage.toLocaleString("en-GB")} miles`} /><InfoTile label="Most recent garage" value={recentProvider} /></div></BillsCard>
      <BillsCard><SectionTitle title="Last service" detail={lastService ? `${formatDate(lastService.date)} · ${formatMoney(lastService.cost)}` : "No service history yet"} />{lastService ? <div className="mt-4"><p className="text-sm font-semibold text-[#20352a]">{lastService.title}</p><p className="mt-1 text-[11px] text-[#667068]">{[lastService.provider, lastService.mileage !== null ? `${lastService.mileage.toLocaleString("en-GB")} miles` : ""].filter(Boolean).join(" · ")}</p><Link href={`${base}/${lastService.id}`} className="mt-4 flex min-h-12 items-center justify-center rounded-[14px] border border-[#6f8e72]/30 text-xs font-semibold text-[#45604d]">View service details</Link></div> : <div className="mt-4"><Empty icon="gear" title="No service recorded" detail="Add your first confirmed service to begin the history." /></div>}</BillsCard>
      <BillsCard className={serviceHealth.tone}><div className="flex items-start gap-3"><UiIcon name="shield" className="mt-0.5 h-6 w-6 shrink-0" /><div><p className="text-sm font-semibold">{serviceHealth.label}</p><p className="mt-1 text-[11px] leading-5 opacity-80">{serviceHealth.detail}</p></div></div></BillsCard>
      <BillsCard><SectionTitle title="Quick actions" detail="Add information or open the right Garage area" /><div className="mt-4 space-y-2"><ActionButton icon="plus" label="Add a service" onClick={() => openNewService("service")} /><ActionButton icon="gear" label="Add maintenance record" onClick={() => openNewService("inspection")} /><ActionLink href={`${base}?view=history`} icon="clock" label="View full service history" /><ActionButton icon="bell" label="Set service reminder" onClick={() => { setReminderDraft({ title: `Service ${vehicleName}`, dueDate: vehicle.nextServiceDate, note: "" }); setMessage(""); setDialog("reminder"); }} /><ActionButton icon="file" label={exporting ? "Preparing summary…" : "Download service summary"} onClick={() => void downloadSummary()} /></div></BillsCard>
    </div> : null}

    {view === "history" ? <div className="space-y-4"><BillsCard><div className="grid grid-cols-2 gap-2"><label className="text-xs font-semibold text-[#667068]">Filter<select value={historyFilter} onChange={(event) => setHistoryFilter(event.target.value as typeof historyFilter)} className={fieldClass}><option value="all">All records</option><option value="service">Services</option><option value="inspection">Maintenance</option></select></label><button type="button" onClick={() => setHistoryAscending((value) => !value)} className="mt-[18px] min-h-11 rounded-[14px] border border-[#20352a]/10 bg-[#faf9f4] text-xs font-semibold text-[#45604d]">{historyAscending ? "Oldest first" : "Newest first"}</button></div></BillsCard><BillsCard><SectionTitle title="Service history" detail={`${filteredHistory.length} record${filteredHistory.length === 1 ? "" : "s"}`} /><div className="mt-4 space-y-3">{filteredHistory.length ? filteredHistory.map((entry) => <ServiceRow key={entry.id} entry={entry} href={`${base}/${entry.id}`} />) : <Empty icon="clock" title="No matching records" detail="Change the filter or add a confirmed service record." />}</div></BillsCard></div> : null}

    {view === "maintenance" ? <div className="space-y-4"><BillsCard><SectionTitle title="Maintenance records" detail="Tyres, brakes, battery, oil, wipers and routine checks" action={<button type="button" onClick={() => openNewService("inspection")} className="min-h-11 rounded-[12px] bg-[#355540] px-3 text-xs font-semibold text-white">Add</button>} /><div className="mt-4 space-y-3">{serviceRecords.filter((entry) => entry.kind === "inspection").length ? serviceRecords.filter((entry) => entry.kind === "inspection").sort((a, b) => b.date.localeCompare(a.date)).map((entry) => <ServiceRow key={entry.id} entry={entry} href={`${base}/${entry.id}`} />) : <Empty icon="gear" title="No maintenance records" detail="Add a confirmed tyre, brake, battery or other maintenance record." />}</div></BillsCard><Link href={`/garage/vehicles/${vehicle.id}/repairs`} className="flex min-h-[78px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white px-4"><span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#eef2e9] text-[#52705a]"><UiIcon name="gear" className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#20352a]">Repairs</span><span className="text-[11px] text-[#667068]">{repairRecords.length ? `${repairRecords.length} separate repair record${repairRecords.length === 1 ? "" : "s"}` : "Faults and repairs stay in their own list"}</span></span><UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" /></Link></div> : null}

    {view === "reminders" ? <BillsCard><SectionTitle title="Service reminders" detail="Upcoming Garage reminders connected with maintenance" action={<button type="button" onClick={() => { setReminderDraft({ title: `Service ${vehicleName}`, dueDate: vehicle.nextServiceDate, note: "" }); setMessage(""); setDialog("reminder"); }} className="min-h-11 rounded-[12px] bg-[#355540] px-3 text-xs font-semibold text-white">Add</button>} /><div className="mt-4 space-y-3">{serviceReminders.length ? serviceReminders.map((reminder) => <Link key={reminder.id} href="/reminders" className="flex min-h-[70px] items-center gap-3 rounded-[17px] border border-[#20352a]/[0.07] bg-[#faf9f4] px-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e7ebe1] text-[#52705a]"><UiIcon name="bell" className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-[#20352a]">{reminder.title}</span><span className="text-[10px] text-[#667068]">{reminder.dueDate ? formatDate(reminder.dueDate) : reminder.timeLabel}</span></span><UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" /></Link>) : <Empty icon="bell" title="No service reminders" detail="Set a reminder using a confirmed date from your garage or service plan." />}</div></BillsCard> : null}

    <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[11px] leading-5 text-[#667068]">DiaryDock organises the vehicle service information you enter. Always confirm service schedules, work carried out and safety advice with a qualified garage or manufacturer.</p>
    <ServiceModal open={dialog === "service"} title={editingId ? "Edit service" : serviceDraft.kind === "inspection" ? "Add maintenance record" : "Add service"} message={message} close={() => setDialog(null)} draft={serviceDraft} setDraft={setServiceDraft} save={saveService} documents={vehicleDocuments} toggleDocument={toggleDocument} />
    <ModalShell open={dialog === "reminder"} title="Set service reminder" subtitle="Add a confirmed date to the shared reminders list." onClose={() => { setDialog(null); setMessage(""); }}>{message ? <Alert text={message} /> : null}<form onSubmit={saveReminder} className="space-y-4"><Field label="Reminder title" value={reminderDraft.title} onChange={(value) => setReminderDraft((draft) => ({ ...draft, title: value }))} /><Field label="Due date" type="date" value={reminderDraft.dueDate} onChange={(value) => setReminderDraft((draft) => ({ ...draft, dueDate: value }))} /><Area label="Notes" value={reminderDraft.note} onChange={(value) => setReminderDraft((draft) => ({ ...draft, note: value }))} /><Submit label="Save reminder" /></form></ModalShell>
  </div>;
}

function ServiceModal({ open, title, message, close, draft, setDraft, save, documents, toggleDocument }: { open: boolean; title: string; message: string; close: () => void; draft: typeof emptyServiceDraft; setDraft: React.Dispatch<React.SetStateAction<typeof emptyServiceDraft>>; save: (event: FormEvent) => void; documents: VaultDocument[]; toggleDocument: (id: string) => void }) {
  return <ModalShell open={open} title={title} subtitle="Record only details confirmed by the garage or service document." onClose={close}>{message ? <Alert text={message} /> : null}<form onSubmit={save} className="space-y-4"><label className="block text-xs font-semibold text-[#667068]">Record type<select value={draft.kind} onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value as Exclude<VehicleServiceKind, "repair"> }))} className={fieldClass}><option value="service">Service</option><option value="inspection">Maintenance</option></select></label><Field label="Service type or title" value={draft.title} onChange={(value) => setDraft((current) => ({ ...current, title: value }))} /><Field label="Garage or provider" value={draft.provider} onChange={(value) => setDraft((current) => ({ ...current, provider: value }))} /><div className="grid grid-cols-2 gap-3"><Field label="Service date" type="date" value={draft.date} onChange={(value) => setDraft((current) => ({ ...current, date: value }))} /><Field label="Mileage" type="number" value={draft.mileage} onChange={(value) => setDraft((current) => ({ ...current, mileage: value }))} /></div><div className="grid grid-cols-2 gap-3"><Field label="Cost" type="number" value={draft.cost} onChange={(value) => setDraft((current) => ({ ...current, cost: value }))} /><Field label="Payment method" value={draft.paymentMethod} onChange={(value) => setDraft((current) => ({ ...current, paymentMethod: value }))} /></div><Area label="Work carried out (one item per line)" value={draft.workItems} onChange={(value) => setDraft((current) => ({ ...current, workItems: value }))} /><Area label="Notes" value={draft.notes} onChange={(value) => setDraft((current) => ({ ...current, notes: value }))} /><div className="grid grid-cols-2 gap-3"><Field label="Next service date" type="date" value={draft.nextServiceDate} onChange={(value) => setDraft((current) => ({ ...current, nextServiceDate: value }))} /><Field label="Next service mileage" type="number" value={draft.nextServiceMileage} onChange={(value) => setDraft((current) => ({ ...current, nextServiceMileage: value }))} /></div>{documents.length ? <fieldset className="space-y-2"><legend className="text-xs font-semibold text-[#667068]">Invoices and reports</legend>{documents.map((document) => <label key={document.id} className="flex min-h-[52px] items-center gap-3 rounded-[14px] border border-[#20352a]/[0.07] bg-[#faf9f4] px-3"><input type="checkbox" checked={draft.documentIds.includes(document.id)} onChange={() => toggleDocument(document.id)} className="h-4 w-4 accent-[#45604d]" /><span className="min-w-0 flex-1 truncate text-xs text-[#20352a]">{document.title}</span></label>)}</fieldset> : <Link href="/capture?room=garage" className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] border border-[#6f8e72]/30 text-xs font-semibold text-[#45604d]"><UiIcon name="plus" className="h-4 w-4" />Scan an invoice or report</Link>}<Submit label="Save service record" /></form></ModalShell>;
}

function ServiceHeader({ title, backHref, action }: { title: string; backHref: string; action?: ReactNode }) { return <header className="flex min-h-14 items-center rounded-[20px] border border-[#20352a]/[0.07] bg-white/90 px-2.5 shadow-sm"><Link href={backHref} aria-label="Go back" className="flex h-11 w-11 items-center justify-center rounded-full text-[#20352a]"><UiIcon name="arrow-left" className="h-5 w-5" /></Link><h1 className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-[#20352a]">{title}</h1>{action ?? <span className="h-11 w-11" />}</header>; }
function VehicleSummary({ vehicle, name, mileage }: { vehicle: VehicleRecord; name: string; mileage: number | null }) { return <section className="flex min-h-[92px] items-center gap-4 rounded-[22px] border border-[#20352a]/[0.08] bg-[#fffdf8] p-3 shadow-sm"><span className="flex h-[68px] w-[92px] shrink-0 items-center justify-center rounded-[16px] bg-[#e8ede3] text-[#526b52]"><UiIcon name="car" className="h-9 w-9" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#20352a]">{name}</p><p className="mt-1 truncate text-[11px] text-[#667068]">{[vehicle.registration || "No registration", vehicle.year?.toString(), vehicle.fuelType, mileage === null ? "Mileage not recorded" : `${mileage.toLocaleString("en-GB")} miles`].filter(Boolean).join(" · ")}</p></div></section>; }
function SectionTitle({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) { return <div className="flex items-start justify-between gap-3"><div><h2 className="text-[16px] font-semibold text-[#20352a]">{title}</h2><p className="mt-1 text-[11px] leading-5 text-[#667068]">{detail}</p></div>{action}</div>; }
function InfoTile({ label, value }: { label: string; value: string }) { return <div className="min-h-[78px] rounded-[17px] border border-[#20352a]/[0.06] bg-white p-3"><p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#6f8e72]">{label}</p><p className="mt-2 break-words text-xs font-semibold leading-5 text-[#20352a]">{value}</p></div>; }
function ServiceRow({ entry, href }: { entry: VehicleServiceEntry; href: string }) { return <article className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#faf9f4] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold text-[#315d45]">{formatDate(entry.date)}</p><h3 className="mt-2 text-sm font-semibold text-[#20352a]">{entry.title}</h3><p className="mt-1 text-[11px] text-[#667068]">{[entry.provider, entry.mileage !== null ? `${entry.mileage.toLocaleString("en-GB")} miles` : ""].filter(Boolean).join(" · ")}</p></div><p className="text-sm font-semibold text-[#20352a]">{formatMoney(entry.cost)}</p></div>{entry.notes ? <p className="mt-3 line-clamp-2 text-[11px] leading-5 text-[#667068]">{entry.notes}</p> : null}<Link href={href} className="mt-3 flex min-h-11 items-center justify-between rounded-[13px] border border-[#20352a]/[0.07] bg-white px-3 text-xs font-semibold text-[#45604d]">View details<UiIcon name="chevron-right" className="h-4 w-4" /></Link></article>; }
function ActionLink({ href, icon, label }: { href: string; icon: IconName; label: string }) { return <Link href={href} className="flex min-h-12 items-center gap-3 rounded-[14px] border border-[#20352a]/[0.07] bg-[#faf9f4] px-3 text-xs font-semibold text-[#20352a]"><UiIcon name={icon} className="h-4 w-4 text-[#52705a]" /><span className="flex-1">{label}</span><UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" /></Link>; }
function ActionButton({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="flex min-h-12 w-full items-center gap-3 rounded-[14px] border border-[#20352a]/[0.07] bg-[#faf9f4] px-3 text-left text-xs font-semibold text-[#20352a]"><UiIcon name={icon} className="h-4 w-4 text-[#52705a]" /><span className="flex-1">{label}</span><UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" /></button>; }
function DocumentRow({ document, vehicleId }: { document: VaultDocument; vehicleId: string }) { return <Link href={`/document/${document.id}?from=vehicle&vehicleId=${vehicleId}`} className="flex min-h-[70px] items-center gap-3 rounded-[17px] border border-[#20352a]/[0.07] bg-[#faf9f4] px-3"><span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-white text-[#52705a]"><UiIcon name="file" className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-[#20352a]">{document.title}</span><span className="text-[10px] text-[#667068]">{document.kind} · {document.updated}</span></span><UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" /></Link>; }
function Empty({ icon, title, detail }: { icon: IconName; title: string; detail: string }) { return <div className="rounded-[18px] border border-dashed border-[#6f8e72]/35 bg-[#f7f7f1] px-5 py-8 text-center"><UiIcon name={icon} className="mx-auto h-6 w-6 text-[#6f8e72]" /><p className="mt-3 text-sm font-semibold text-[#20352a]">{title}</p><p className="mt-1 text-[11px] leading-5 text-[#667068]">{detail}</p></div>; }
function Alert({ text }: { text: string }) { return <p role="status" className="mb-3 rounded-[12px] bg-[#f1ecdf] p-3 text-xs text-[#806b45]">{text}</p>; }
function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: "text" | "date" | "number" }) { return <label className="block text-xs font-semibold text-[#667068]">{label}<input type={type} min={type === "number" ? "0" : undefined} step={type === "number" ? "any" : undefined} value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass} /></label>; }
function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-xs font-semibold text-[#667068]">{label}<textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} className={`${fieldClass} resize-y`} /></label>; }
function Submit({ label }: { label: string }) { return <button type="submit" className="min-h-12 w-full rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white">{label}</button>; }
