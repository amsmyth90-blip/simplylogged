"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";

import { BillsCard, fieldClass } from "@/components/bills/BillsUi";
import { GarageVehicleSectionNav } from "@/components/garage/GarageVehicleSectionNav";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { ModalShell } from "@/components/ModalShell";
import { UiIcon, type IconName } from "@/components/UiIcon";
import {
  latestMileage,
  vehicleDisplayName,
  type VehicleMotRecord,
  type VehicleRecord,
} from "@/lib/vehicle-records";

export type MotTaxView = "overview" | "history" | "road-tax" | "key-dates" | "documents";

function formatDate(value: string) {
  if (!value) return "Not recorded";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatMoney(value: number | null) {
  if (value === null) return "Not recorded";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2 }).format(value);
}

function daysUntil(value: string) {
  if (!value) return null;
  const target = new Date(`${value}T12:00:00`).getTime();
  if (Number.isNaN(target)) return null;
  return Math.ceil((target - Date.now()) / 86_400_000);
}

function dateStatus(value: string) {
  const days = daysUntil(value);
  if (days === null) return { text: "Add date", tone: "bg-[#eef0e9] text-[#667068]" };
  if (days < 0) return { text: `${Math.abs(days)} days overdue`, tone: "bg-[#fbe5df] text-[#a4473d]" };
  if (days <= 30) return { text: `${days} days`, tone: "bg-[#fbedd8] text-[#a46b2c]" };
  return { text: `${days} days`, tone: "bg-[#e9f0e4] text-[#52705a]" };
}

function audit(action: string) {
  return { id: crypto.randomUUID(), action, createdAt: new Date().toISOString() };
}

function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function VehicleMotTaxWorkspace({ vehicleId, view = "overview" }: { vehicleId: string; view?: MotTaxView }) {
  const { state, hydrated, updateState } = useDiaryDockData();
  const vehicle = state.vehicles.vehicles.find((item) => item.id === vehicleId);
  const [dialog, setDialog] = useState<"mot" | "tax" | null>(null);
  const [message, setMessage] = useState("");
  const [documentFilter, setDocumentFilter] = useState<"All" | "MOT" | "Tax">("All");
  const [motDraft, setMotDraft] = useState({ testDate: "", result: "pass" as VehicleMotRecord["result"], mileage: "", advisoryCount: "", notes: "", documentId: "" });
  const [taxDraft, setTaxDraft] = useState({ renewalDate: "", amount: "", paymentFrequency: "", paidDate: "", paymentReference: "", vehicleClass: "", documentId: "" });

  const linkedDocuments = useMemo(() => {
    if (!vehicle) return [];
    const linked = new Set(vehicle.documentIds);
    return state.vaultDocuments.filter((document) => linked.has(document.id));
  }, [state.vaultDocuments, vehicle]);
  const complianceDocuments = linkedDocuments.filter((document) => /\bmot\b|road tax|vehicle tax|tax receipt|tax disc/i.test(`${document.title} ${document.category} ${document.extractionSummary ?? ""}`));
  const filteredDocuments = complianceDocuments.filter((document) => documentFilter === "All" || (documentFilter === "MOT" ? /\bmot\b/i.test(document.title) : /tax/i.test(document.title)));
  const garageReminders = state.reminders.filter((reminder) => reminder.roomId === "garage" && reminder.group !== "done");

  const updateVehicle = (updater: (current: VehicleRecord) => VehicleRecord) => {
    updateState((current) => ({
      ...current,
      vehicles: { vehicles: current.vehicles.vehicles.map((item) => item.id === vehicleId ? updater(item) : item) },
    }));
  };

  if (!hydrated) return <div className="mx-auto max-w-[760px] rounded-[24px] bg-white/80 p-8 text-sm text-[#667068]">Opening MOT &amp; Tax…</div>;
  if (!vehicle) return <div className="mx-auto max-w-[760px]"><BillsCard><p className="text-sm font-semibold text-[#20352a]">Vehicle not found</p><Link href="/room/garage" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#45604d]">Back to Garage</Link></BillsCard></div>;

  const mileage = latestMileage(vehicle);
  const vehicleName = vehicleDisplayName(vehicle);
  const keyDates = [
    { label: "MOT due", value: vehicle.motDueDate, icon: "calendar" as IconName, match: /mot/i },
    { label: "Road tax renewal", value: vehicle.taxDueDate, icon: "file" as IconName, match: /tax/i },
    { label: "Insurance renewal", value: vehicle.insuranceRenewalDate, icon: "shield" as IconName, match: /insurance|policy/i },
    { label: "Service due", value: vehicle.nextServiceDate, icon: "gear" as IconName, match: /service|maintenance/i },
    { label: "Breakdown cover", value: vehicle.breakdownRenewalDate, icon: "car" as IconName, match: /breakdown|roadside/i },
  ];
  const base = `/garage/vehicles/${vehicle.id}/mot-tax`;
  const views: { id: MotTaxView; label: string; href: string }[] = [
    { id: "overview", label: "Overview", href: base },
    { id: "history", label: "MOT History", href: `${base}/history` },
    { id: "road-tax", label: "Road Tax", href: `${base}/road-tax` },
    { id: "key-dates", label: "Key Dates", href: `${base}/key-dates` },
    { id: "documents", label: "Documents", href: `${base}/documents` },
  ];

  const openTax = () => {
    setTaxDraft({
      renewalDate: vehicle.taxDueDate,
      amount: vehicle.roadTax.amount?.toString() ?? "",
      paymentFrequency: vehicle.roadTax.paymentFrequency,
      paidDate: vehicle.roadTax.paidDate,
      paymentReference: vehicle.roadTax.paymentReference,
      vehicleClass: vehicle.roadTax.vehicleClass,
      documentId: vehicle.roadTax.documentId ?? "",
    });
    setMessage("");
    setDialog("tax");
  };

  const saveMot = (event: FormEvent) => {
    event.preventDefault();
    if (!motDraft.testDate) { setMessage("Add the MOT test date."); return; }
    const record: VehicleMotRecord = {
      id: crypto.randomUUID(),
      testDate: motDraft.testDate,
      result: motDraft.result,
      mileage: numberOrNull(motDraft.mileage),
      advisoryCount: Math.max(0, numberOrNull(motDraft.advisoryCount) ?? 0),
      notes: motDraft.notes.trim(),
      documentId: motDraft.documentId || undefined,
      createdAt: new Date().toISOString(),
    };
    updateVehicle((current) => ({ ...current, motHistory: [record, ...current.motHistory], audit: [audit(`MOT ${record.result} recorded for ${formatDate(record.testDate)}`), ...current.audit], updatedAt: new Date().toISOString() }));
    setMotDraft({ testDate: "", result: "pass", mileage: "", advisoryCount: "", notes: "", documentId: "" });
    setDialog(null);
  };

  const saveTax = (event: FormEvent) => {
    event.preventDefault();
    updateVehicle((current) => ({
      ...current,
      taxDueDate: taxDraft.renewalDate,
      roadTax: {
        amount: numberOrNull(taxDraft.amount),
        paymentFrequency: taxDraft.paymentFrequency.trim(),
        paidDate: taxDraft.paidDate,
        paymentReference: taxDraft.paymentReference.trim(),
        vehicleClass: taxDraft.vehicleClass.trim(),
        documentId: taxDraft.documentId || undefined,
      },
      audit: [audit("Road tax details updated"), ...current.audit],
      updatedAt: new Date().toISOString(),
    }));
    setDialog(null);
  };

  return <div className="mx-auto w-full max-w-[760px] space-y-4 pb-28">
    <header className="flex min-h-14 items-center rounded-[20px] border border-[#20352a]/[0.07] bg-white/90 px-2.5 shadow-sm"><Link href="/room/garage" aria-label="Back to Garage" className="flex h-11 w-11 items-center justify-center rounded-full text-[#20352a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"><UiIcon name="arrow-left" className="h-5 w-5" /></Link><h1 className="min-w-0 flex-1 truncate text-center font-serif text-lg text-[#20352a]">MOT &amp; Tax</h1><Link href="/reminders" aria-label="Open reminders" className="flex h-11 w-11 items-center justify-center rounded-full text-[#20352a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"><UiIcon name="bell" className="h-5 w-5" /></Link></header>
    <GarageVehicleSectionNav vehicleId={vehicle.id} />
    <section className="flex min-h-[92px] items-center gap-4 rounded-[22px] border border-[#20352a]/[0.08] bg-[#fffdf8] p-3 shadow-sm"><span className="flex h-[68px] w-[92px] shrink-0 items-center justify-center rounded-[16px] bg-[#e8ede3] text-[#526b52]"><UiIcon name="car" className="h-9 w-9" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#20352a]">{vehicleName}</p><p className="mt-1 truncate text-[11px] text-[#667068]">{[vehicle.registration || "No registration", mileage ? `${mileage.mileage.toLocaleString("en-GB")} miles` : "Mileage not recorded"].join(" · ")}</p></div></section>
    <nav aria-label="MOT and tax views" className="rounded-[18px] border border-[#20352a]/[0.07] bg-white p-1.5 shadow-sm"><div className="grid grid-cols-5 gap-1">{views.map((item)=><Link key={item.id} href={item.href} aria-current={view===item.id?"page":undefined} className={`flex min-h-11 min-w-0 items-center justify-center rounded-[12px] px-0.5 text-center text-[10px] font-semibold leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] sm:px-2 ${view===item.id?"bg-[#355540] text-white":"text-[#667068] hover:bg-[#eef2e9]"}`}>{item.label}</Link>)}</div></nav>

    {view === "overview" ? <div className="space-y-4"><BillsCard><SectionTitle title="Key legal dates" detail="A clear summary of what is recorded for this vehicle" /><div className="mt-4 space-y-2">{keyDates.slice(0,3).map((item)=><DateCard key={item.label} {...item} />)}</div><div className="mt-4 grid grid-cols-2 gap-2"><Link href="/reminders" className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-[#355540] px-3 text-xs font-semibold text-white"><UiIcon name="plus" className="h-4 w-4" />Add reminder</Link><Link href={`${base}/key-dates`} className="flex min-h-12 items-center justify-center rounded-[14px] border border-[#6f8e72]/30 px-3 text-xs font-semibold text-[#45604d]">View all dates</Link></div></BillsCard><div className="grid gap-3 sm:grid-cols-2"><Link href={`${base}/history`} className="flex min-h-[82px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white px-4"><span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#e8ede3] text-[#52705a]"><UiIcon name="clock" className="h-5 w-5" /></span><span className="flex-1"><span className="block text-sm font-semibold text-[#20352a]">MOT history</span><span className="text-[11px] text-[#667068]">{vehicle.motHistory.length} recorded test{vehicle.motHistory.length===1?"":"s"}</span></span><UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" /></Link><Link href={`${base}/documents`} className="flex min-h-[82px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white px-4"><span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#e8ede3] text-[#52705a]"><UiIcon name="folder" className="h-5 w-5" /></span><span className="flex-1"><span className="block text-sm font-semibold text-[#20352a]">Documents</span><span className="text-[11px] text-[#667068]">{complianceDocuments.length} linked file{complianceDocuments.length===1?"":"s"}</span></span><UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" /></Link></div></div> : null}

    {view === "history" ? <BillsCard><SectionTitle title="MOT history" detail="Results are shown only when you record them" action={<button type="button" onClick={()=>{setMessage("");setDialog("mot");}} className="min-h-11 rounded-[12px] bg-[#eef2e9] px-3 text-xs font-semibold text-[#45604d]">Add MOT</button>} /><div className="mt-4 space-y-3">{vehicle.motHistory.length?[...vehicle.motHistory].sort((a,b)=>b.testDate.localeCompare(a.testDate)).map((record)=><article key={record.id} className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#faf9f4] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[#20352a]">{formatDate(record.testDate)}</p><span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase ${record.result==="pass"?"bg-[#e5efdf] text-[#45604d]":"bg-[#fbe5df] text-[#a4473d]"}`}>{record.result}</span></div><p className="text-right text-[11px] text-[#667068]">{record.mileage!==null?`${record.mileage.toLocaleString("en-GB")} miles`:"Mileage not recorded"}<br/>{record.advisoryCount} advisor{record.advisoryCount===1?"y":"ies"}</p></div>{record.notes?<p className="mt-3 text-[11px] leading-5 text-[#667068]">{record.notes}</p>:null}{record.documentId?<Link href={`/document/${record.documentId}?from=vehicle&vehicleId=${vehicle.id}`} className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-[#45604d]"><UiIcon name="file" className="h-4 w-4" />View certificate</Link>:null}</article>):<Empty title="No MOT history recorded" detail="Add past or future MOT results when you have confirmed information." />}</div></BillsCard> : null}

    {view === "road-tax" ? <div className="space-y-4"><BillsCard className="bg-[linear-gradient(135deg,#eef1e4,#fffdf8)]"><div className="flex items-start gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#52705a]"><UiIcon name="check" className="h-5 w-5" /></span><div><h2 className="text-base font-semibold text-[#20352a]">{vehicle.taxDueDate?"Road-tax renewal recorded":"Add your road-tax details"}</h2><p className="mt-1 text-[11px] text-[#667068]">{vehicle.taxDueDate?`Renewal date ${formatDate(vehicle.taxDueDate)}`:"DiaryDock does not check DVLA status automatically."}</p></div></div></BillsCard><BillsCard><SectionTitle title="Road-tax details" detail="Payment information you have chosen to store" action={<button type="button" onClick={openTax} className="min-h-11 rounded-[12px] bg-[#eef2e9] px-3 text-xs font-semibold text-[#45604d]">Update</button>} /><dl className="mt-4"><Detail label="Renewal date" value={formatDate(vehicle.taxDueDate)} /><Detail label="Payment frequency" value={vehicle.roadTax.paymentFrequency||"Not recorded"} /><Detail label="Amount" value={formatMoney(vehicle.roadTax.amount)} /><Detail label="Paid on" value={formatDate(vehicle.roadTax.paidDate)} /><Detail label="Payment reference" value={vehicle.roadTax.paymentReference||"Not recorded"} /><Detail label="Vehicle class" value={vehicle.roadTax.vehicleClass||"Not recorded"} /></dl>{vehicle.roadTax.documentId?<Link href={`/document/${vehicle.roadTax.documentId}?from=vehicle&vehicleId=${vehicle.id}`} className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-[14px] border border-[#6f8e72]/30 text-xs font-semibold text-[#45604d]"><UiIcon name="file" className="h-4 w-4" />View tax document</Link>:null}</BillsCard><p className="rounded-[18px] bg-[#f0f2e9] px-4 py-3 text-[11px] leading-5 text-[#667068]">DiaryDock organises the information you enter. Always check official vehicle-tax status and payment requirements with DVLA.</p></div> : null}

    {view === "key-dates" ? <BillsCard><SectionTitle title="Upcoming key dates" detail="Dates recorded across this vehicle" action={<Link href="/reminders" className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-[#45604d]">Open reminders</Link>} /><div className="mt-4 space-y-2">{keyDates.map((item)=><DateCard key={item.label} {...item} />)}</div>{garageReminders.length?<div className="mt-5 border-t border-[#20352a]/[0.07] pt-4"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6f8e72]">Existing Garage reminders</p><div className="mt-2 space-y-2">{garageReminders.slice(0,5).map((reminder)=><Link key={reminder.id} href="/reminders" className="flex min-h-[62px] items-center gap-3 rounded-[16px] bg-[#faf9f4] px-3"><UiIcon name="bell" className="h-4 w-4 text-[#52705a]"/><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-[#20352a]">{reminder.title}</span><span className="text-[10px] text-[#667068]">{reminder.dueDate?formatDate(reminder.dueDate):reminder.timeLabel}</span></span></Link>)}</div></div>:null}</BillsCard> : null}

    {view === "documents" ? <BillsCard><SectionTitle title="MOT & tax documents" detail="Original files stay in All Files and are linked here" action={<Link href="/capture?room=garage" className="inline-flex min-h-11 items-center gap-1 px-2 text-xs font-semibold text-[#45604d]"><UiIcon name="plus" className="h-4 w-4" />Add</Link>} /><div className="mt-4 grid grid-cols-3 gap-1 rounded-[14px] bg-[#f0f2e9] p-1">{(["All","MOT","Tax"] as const).map((filter)=><button key={filter} type="button" onClick={()=>setDocumentFilter(filter)} className={`min-h-11 rounded-[11px] text-[10px] font-semibold ${documentFilter===filter?"bg-white text-[#315d45] shadow-sm":"text-[#667068]"}`}>{filter}</button>)}</div><div className="mt-4 space-y-2">{filteredDocuments.length?filteredDocuments.map((document)=><Link key={document.id} href={`/document/${document.id}?from=vehicle&vehicleId=${vehicle.id}`} className="flex min-h-[72px] items-center gap-3 rounded-[17px] border border-[#20352a]/[0.07] bg-[#faf9f4] px-3"><span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white text-[#52705a]"><UiIcon name="file" className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-[#20352a]">{document.title}</span><span className="text-[10px] text-[#667068]">{document.kind} · {document.updated}</span></span><UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" /></Link>):<Empty title="No matching documents" detail="Scan or link an MOT certificate or road-tax receipt when you have one." />}</div></BillsCard> : null}

    <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[11px] leading-5 text-[#667068]">DiaryDock helps you organise vehicle dates and documents. It does not confirm legal status or replace official DVLA and MOT records.</p>

    <ModalShell open={dialog==="mot"} title="Add MOT record" subtitle={`Record confirmed information for ${vehicleName}.`} onClose={()=>{setDialog(null);setMessage("");}}>{message?<p role="alert" className="mb-3 rounded-[12px] bg-[#fbe5df] p-3 text-xs text-[#a4473d]">{message}</p>:null}<form onSubmit={saveMot} className="space-y-4"><label className="block text-xs font-semibold text-[#667068]">Result<select value={motDraft.result} onChange={(event)=>setMotDraft((draft)=>({...draft,result:event.target.value as VehicleMotRecord["result"]}))} className={fieldClass}><option value="pass">Pass</option><option value="fail">Fail</option></select></label><div className="grid grid-cols-2 gap-3"><Field label="Test date" type="date" value={motDraft.testDate} onChange={(value)=>setMotDraft((draft)=>({...draft,testDate:value}))}/><Field label="Mileage" type="number" value={motDraft.mileage} onChange={(value)=>setMotDraft((draft)=>({...draft,mileage:value}))}/></div><Field label="Advisory count" type="number" value={motDraft.advisoryCount} onChange={(value)=>setMotDraft((draft)=>({...draft,advisoryCount:value}))}/><label className="block text-xs font-semibold text-[#667068]">Certificate<select value={motDraft.documentId} onChange={(event)=>setMotDraft((draft)=>({...draft,documentId:event.target.value}))} className={fieldClass}><option value="">None</option>{complianceDocuments.filter((document)=>/\bmot\b/i.test(document.title)).map((document)=><option key={document.id} value={document.id}>{document.title}</option>)}</select></label><Area label="Advisories or notes" value={motDraft.notes} onChange={(value)=>setMotDraft((draft)=>({...draft,notes:value}))}/><Submit label="Save MOT record" /></form></ModalShell>
    <ModalShell open={dialog==="tax"} title="Road-tax details" subtitle={`Store payment details for ${vehicleName}.`} onClose={()=>setDialog(null)}><form onSubmit={saveTax} className="space-y-4"><div className="grid grid-cols-2 gap-3"><Field label="Renewal date" type="date" value={taxDraft.renewalDate} onChange={(value)=>setTaxDraft((draft)=>({...draft,renewalDate:value}))}/><Field label="Amount" type="number" value={taxDraft.amount} onChange={(value)=>setTaxDraft((draft)=>({...draft,amount:value}))}/></div><Field label="Payment frequency" value={taxDraft.paymentFrequency} onChange={(value)=>setTaxDraft((draft)=>({...draft,paymentFrequency:value}))}/><Field label="Paid date" type="date" value={taxDraft.paidDate} onChange={(value)=>setTaxDraft((draft)=>({...draft,paidDate:value}))}/><Field label="Payment reference" value={taxDraft.paymentReference} onChange={(value)=>setTaxDraft((draft)=>({...draft,paymentReference:value}))}/><Field label="Vehicle class" value={taxDraft.vehicleClass} onChange={(value)=>setTaxDraft((draft)=>({...draft,vehicleClass:value}))}/><label className="block text-xs font-semibold text-[#667068]">Tax document<select value={taxDraft.documentId} onChange={(event)=>setTaxDraft((draft)=>({...draft,documentId:event.target.value}))} className={fieldClass}><option value="">None</option>{complianceDocuments.filter((document)=>/tax/i.test(document.title)).map((document)=><option key={document.id} value={document.id}>{document.title}</option>)}</select></label><Submit label="Save road-tax details" /></form></ModalShell>
  </div>;
}

function SectionTitle({title,detail,action}:{title:string;detail:string;action?:ReactNode}){return <div className="flex items-start justify-between gap-3"><div><h2 className="text-[16px] font-semibold text-[#20352a]">{title}</h2><p className="mt-1 text-[11px] leading-5 text-[#667068]">{detail}</p></div>{action}</div>}
function DateCard({label,value,icon}:{label:string;value:string;icon:IconName;match?:RegExp}){const status=dateStatus(value);return <div className="flex min-h-[72px] items-center gap-3 rounded-[17px] border border-[#20352a]/[0.07] bg-[#faf9f4] px-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e7ebe1] text-[#52705a]"><UiIcon name={icon} className="h-5 w-5"/></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-[#20352a]">{label}</span><span className="mt-1 block text-[10px] text-[#667068]">{formatDate(value)}</span></span><span className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${status.tone}`}>{status.text}</span></div>}
function Detail({label,value}:{label:string;value:string}){return <div className="flex min-h-11 items-center justify-between gap-4 border-b border-[#20352a]/[0.06] py-2.5 last:border-0"><dt className="text-xs text-[#667068]">{label}</dt><dd className="max-w-[58%] text-right text-xs font-semibold text-[#20352a]">{value}</dd></div>}
function Empty({title,detail}:{title:string;detail:string}){return <div className="rounded-[18px] border border-dashed border-[#6f8e72]/35 bg-[#f7f7f1] px-5 py-8 text-center"><UiIcon name="folder" className="mx-auto h-6 w-6 text-[#6f8e72]"/><p className="mt-3 text-sm font-semibold text-[#20352a]">{title}</p><p className="mt-1 text-[11px] leading-5 text-[#667068]">{detail}</p></div>}
function Field({label,value,onChange,type="text"}:{label:string;value:string;onChange:(value:string)=>void;type?:"text"|"date"|"number"}){return <label className="block text-xs font-semibold text-[#667068]">{label}<input type={type} min={type==="number"?"0":undefined} step={type==="number"?"any":undefined} value={value} onChange={(event)=>onChange(event.target.value)} className={fieldClass}/></label>}
function Area({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}){return <label className="block text-xs font-semibold text-[#667068]">{label}<textarea rows={4} value={value} onChange={(event)=>onChange(event.target.value)} className={`${fieldClass} resize-y`}/></label>}
function Submit({label}:{label:string}){return <button type="submit" className="min-h-12 w-full rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white">{label}</button>}
