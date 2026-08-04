"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";

import { BillsCard, fieldClass } from "@/components/bills/BillsUi";
import { GarageVehicleSectionNav } from "@/components/garage/GarageVehicleSectionNav";
import { useLifeDockData } from "@/components/LifeDockDataProvider";
import { ModalShell } from "@/components/ModalShell";
import { UiIcon, type IconName } from "@/components/UiIcon";
import {
  latestMileage,
  vehicleDisplayName,
  type VehicleInsuranceClaim,
  type VehicleInsuranceDriver,
  type VehicleInsuranceRenewal,
  type VehicleMotorInsurance,
  type VehicleRecord,
} from "@/lib/vehicle-records";

export type InsuranceView = "overview" | "policy" | "claims" | "documents" | "renewals";

type Dialog = "policy" | "driver" | "claim" | "renewal" | "documents" | null;
type TriState = "unknown" | "yes" | "no";

const emptyPolicyDraft = {
  provider: "",
  policyNumber: "",
  status: "not-recorded" as VehicleMotorInsurance["status"],
  policyStartDate: "",
  renewalDate: "",
  premium: "",
  paymentFrequency: "",
  coverType: "",
  voluntaryExcess: "",
  compulsoryExcess: "",
  noClaimsYears: "",
  courtesyCar: "unknown" as TriState,
  windscreenCover: "unknown" as TriState,
  legalExpensesCover: "unknown" as TriState,
  breakdownIncluded: "unknown" as TriState,
  providerPhone: "",
  claimsPhone: "",
  notes: "",
  breakdownProvider: "",
  breakdownPolicyNumber: "",
  breakdownRenewalDate: "",
};

const emptyDriverDraft = { name: "", relationship: "", mainDriver: false, notes: "" };
const emptyClaimDraft = { incidentDate: "", claimType: "", status: "draft" as VehicleInsuranceClaim["status"], reference: "", description: "", documentId: "" };
const emptyRenewalDraft = { renewalDate: "", provider: "", premium: "", outcome: "upcoming" as VehicleInsuranceRenewal["outcome"], notes: "", documentId: "" };

function formatDate(value: string) {
  if (!value) return "Not recorded";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatMoney(value: number | null) {
  return value === null
    ? "Not recorded"
    : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2 }).format(value);
}

function daysUntil(value: string) {
  if (!value) return null;
  const target = new Date(`${value}T12:00:00`).getTime();
  return Number.isNaN(target) ? null : Math.ceil((target - Date.now()) / 86_400_000);
}

function renewalMessage(value: string) {
  const days = daysUntil(value);
  if (days === null) return { label: "Add renewal date", tone: "text-[#667068]" };
  if (days < 0) return { label: `${Math.abs(days)} days overdue`, tone: "text-[#a4473d]" };
  if (days === 0) return { label: "Due today", tone: "text-[#a46b2c]" };
  return { label: `in ${days} days`, tone: days <= 30 ? "text-[#a46b2c]" : "text-[#315d45]" };
}

function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function boolToTri(value: boolean | null): TriState {
  return value === null ? "unknown" : value ? "yes" : "no";
}

function triToBool(value: TriState) {
  return value === "unknown" ? null : value === "yes";
}

function booleanLabel(value: boolean | null) {
  return value === null ? "Not recorded" : value ? "Included" : "Not included";
}

function audit(action: string) {
  return { id: crypto.randomUUID(), action, createdAt: new Date().toISOString() };
}

function humanStatus(value: string) {
  return value.replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export function VehicleInsuranceWorkspace({ vehicleId, view = "overview" }: { vehicleId: string; view?: InsuranceView }) {
  const { state, hydrated, updateState } = useLifeDockData();
  const vehicle = state.vehicles.vehicles.find((item) => item.id === vehicleId);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [message, setMessage] = useState("");
  const [policyDraft, setPolicyDraft] = useState(emptyPolicyDraft);
  const [driverDraft, setDriverDraft] = useState(emptyDriverDraft);
  const [claimDraft, setClaimDraft] = useState(emptyClaimDraft);
  const [renewalDraft, setRenewalDraft] = useState(emptyRenewalDraft);

  const insuranceDocuments = useMemo(() => {
    if (!vehicle) return [];
    const linkedToVehicle = new Set(vehicle.documentIds);
    const linkedToPolicy = new Set(vehicle.motorInsurance.documentIds);
    return state.vaultDocuments.filter((document) =>
      linkedToPolicy.has(document.id) ||
      (linkedToVehicle.has(document.id) && /insurance|policy|breakdown|roadside|no claims|claim form|motor cover/i.test(`${document.title} ${document.category} ${document.extractionSummary ?? ""}`)),
    );
  }, [state.vaultDocuments, vehicle]);

  if (!hydrated) return <div className="mx-auto max-w-[760px] rounded-[24px] bg-white/80 p-8 text-sm text-[#667068]">Opening Insurance…</div>;
  if (!vehicle) return <div className="mx-auto max-w-[760px]"><BillsCard><p className="text-sm font-semibold text-[#20352a]">Vehicle not found</p><Link href="/room/garage" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#45604d]">Back to Garage</Link></BillsCard></div>;

  const insurance = vehicle.motorInsurance;
  const currentDocumentIds = new Set(insurance.documentIds);
  const currentDocuments = insuranceDocuments.filter((document) => currentDocumentIds.has(document.id));
  const availableDocuments = insuranceDocuments.filter((document) => !currentDocumentIds.has(document.id));
  const mileage = latestMileage(vehicle);
  const vehicleName = vehicleDisplayName(vehicle);
  const renewal = renewalMessage(vehicle.insuranceRenewalDate);
  const base = `/garage/vehicles/${vehicle.id}/insurance`;
  const views: { id: InsuranceView; label: string; href: string }[] = [
    { id: "overview", label: "Overview", href: base },
    { id: "policy", label: "Policy", href: `${base}?view=policy` },
    { id: "claims", label: "Claims", href: `${base}?view=claims` },
    { id: "documents", label: "Documents", href: `${base}?view=documents` },
    { id: "renewals", label: "Renewals", href: `${base}?view=renewals` },
  ];

  const updateVehicle = (updater: (current: VehicleRecord) => VehicleRecord) => {
    updateState((current) => ({
      ...current,
      vehicles: { vehicles: current.vehicles.vehicles.map((item) => item.id === vehicle.id ? updater(item) : item) },
    }));
  };

  const openPolicy = () => {
    setPolicyDraft({
      provider: insurance.provider,
      policyNumber: insurance.policyNumber,
      status: insurance.status,
      policyStartDate: insurance.policyStartDate,
      renewalDate: vehicle.insuranceRenewalDate,
      premium: insurance.premium?.toString() ?? "",
      paymentFrequency: insurance.paymentFrequency,
      coverType: insurance.coverType,
      voluntaryExcess: insurance.voluntaryExcess?.toString() ?? "",
      compulsoryExcess: insurance.compulsoryExcess?.toString() ?? "",
      noClaimsYears: insurance.noClaimsYears?.toString() ?? "",
      courtesyCar: boolToTri(insurance.courtesyCar),
      windscreenCover: boolToTri(insurance.windscreenCover),
      legalExpensesCover: boolToTri(insurance.legalExpensesCover),
      breakdownIncluded: boolToTri(insurance.breakdownIncluded),
      providerPhone: insurance.providerPhone,
      claimsPhone: insurance.claimsPhone,
      notes: insurance.notes,
      breakdownProvider: insurance.breakdownProvider,
      breakdownPolicyNumber: insurance.breakdownPolicyNumber,
      breakdownRenewalDate: vehicle.breakdownRenewalDate,
    });
    setDialog("policy");
  };

  const savePolicy = (event: FormEvent) => {
    event.preventDefault();
    updateVehicle((current) => ({
      ...current,
      insuranceRenewalDate: policyDraft.renewalDate,
      breakdownRenewalDate: policyDraft.breakdownRenewalDate,
      motorInsurance: {
        ...current.motorInsurance,
        provider: policyDraft.provider.trim(),
        policyNumber: policyDraft.policyNumber.trim(),
        status: policyDraft.status,
        policyStartDate: policyDraft.policyStartDate,
        premium: numberOrNull(policyDraft.premium),
        paymentFrequency: policyDraft.paymentFrequency.trim(),
        coverType: policyDraft.coverType.trim(),
        voluntaryExcess: numberOrNull(policyDraft.voluntaryExcess),
        compulsoryExcess: numberOrNull(policyDraft.compulsoryExcess),
        noClaimsYears: numberOrNull(policyDraft.noClaimsYears),
        courtesyCar: triToBool(policyDraft.courtesyCar),
        windscreenCover: triToBool(policyDraft.windscreenCover),
        legalExpensesCover: triToBool(policyDraft.legalExpensesCover),
        breakdownIncluded: triToBool(policyDraft.breakdownIncluded),
        providerPhone: policyDraft.providerPhone.trim(),
        claimsPhone: policyDraft.claimsPhone.trim(),
        notes: policyDraft.notes.trim(),
        breakdownProvider: policyDraft.breakdownProvider.trim(),
        breakdownPolicyNumber: policyDraft.breakdownPolicyNumber.trim(),
      },
      audit: [audit("Motor insurance policy updated"), ...current.audit],
      updatedAt: new Date().toISOString(),
    }));
    setDialog(null);
  };

  const saveDriver = (event: FormEvent) => {
    event.preventDefault();
    if (!driverDraft.name.trim()) { setMessage("Add the driver’s name."); return; }
    const driver: VehicleInsuranceDriver = { id: crypto.randomUUID(), name: driverDraft.name.trim(), relationship: driverDraft.relationship.trim(), mainDriver: driverDraft.mainDriver, notes: driverDraft.notes.trim(), createdAt: new Date().toISOString() };
    updateVehicle((current) => ({ ...current, motorInsurance: { ...current.motorInsurance, namedDrivers: [...current.motorInsurance.namedDrivers, driver] }, audit: [audit(`Named driver added: ${driver.name}`), ...current.audit], updatedAt: new Date().toISOString() }));
    setDriverDraft(emptyDriverDraft);
    setMessage("");
    setDialog(null);
  };

  const saveClaim = (event: FormEvent) => {
    event.preventDefault();
    if (!claimDraft.incidentDate || !claimDraft.claimType.trim()) { setMessage("Add the incident date and claim type."); return; }
    const now = new Date().toISOString();
    const claim: VehicleInsuranceClaim = { id: crypto.randomUUID(), incidentDate: claimDraft.incidentDate, claimType: claimDraft.claimType.trim(), status: claimDraft.status, reference: claimDraft.reference.trim(), description: claimDraft.description.trim(), documentIds: claimDraft.documentId ? [claimDraft.documentId] : [], createdAt: now, updatedAt: now };
    updateVehicle((current) => ({ ...current, motorInsurance: { ...current.motorInsurance, claims: [claim, ...current.motorInsurance.claims] }, audit: [audit(`Insurance claim recorded: ${claim.claimType}`), ...current.audit], updatedAt: now }));
    setClaimDraft(emptyClaimDraft);
    setMessage("");
    setDialog(null);
  };

  const saveRenewal = (event: FormEvent) => {
    event.preventDefault();
    if (!renewalDraft.renewalDate) { setMessage("Add the renewal date."); return; }
    const record: VehicleInsuranceRenewal = { id: crypto.randomUUID(), renewalDate: renewalDraft.renewalDate, provider: renewalDraft.provider.trim(), premium: numberOrNull(renewalDraft.premium), outcome: renewalDraft.outcome, notes: renewalDraft.notes.trim(), documentIds: renewalDraft.documentId ? [renewalDraft.documentId] : [], createdAt: new Date().toISOString() };
    updateVehicle((current) => ({ ...current, motorInsurance: { ...current.motorInsurance, renewals: [record, ...current.motorInsurance.renewals] }, audit: [audit(`Insurance renewal recorded for ${formatDate(record.renewalDate)}`), ...current.audit], updatedAt: new Date().toISOString() }));
    setRenewalDraft(emptyRenewalDraft);
    setMessage("");
    setDialog(null);
  };

  const togglePolicyDocument = (documentId: string) => {
    updateVehicle((current) => {
      const linked = current.motorInsurance.documentIds.includes(documentId);
      return { ...current, motorInsurance: { ...current.motorInsurance, documentIds: linked ? current.motorInsurance.documentIds.filter((id) => id !== documentId) : [...current.motorInsurance.documentIds, documentId] }, audit: [audit(`${linked ? "Unlinked" : "Linked"} motor insurance document`), ...current.audit], updatedAt: new Date().toISOString() };
    });
  };

  return <div className="mx-auto w-full max-w-[760px] space-y-4 pb-28">
    <header className="flex min-h-14 items-center rounded-[20px] border border-[#20352a]/[0.07] bg-white/90 px-2.5 shadow-sm">
      <Link href="/room/garage" aria-label="Back to Garage" className="flex h-11 w-11 items-center justify-center rounded-full text-[#20352a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"><UiIcon name="arrow-left" className="h-5 w-5" /></Link>
      <h1 className="min-w-0 flex-1 truncate text-center font-serif text-lg text-[#20352a]">Insurance</h1>
      <button type="button" onClick={openPolicy} className="min-h-11 rounded-full px-3 text-xs font-semibold text-[#315d45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">Edit</button>
    </header>

    <GarageVehicleSectionNav vehicleId={vehicle.id} />
    <nav aria-label="Insurance views" className="rounded-[18px] border border-[#20352a]/[0.07] bg-white p-1.5 shadow-sm">
      <div className="grid grid-cols-5 gap-1">{views.map((item) => <Link key={item.id} href={item.href} aria-current={view === item.id ? "page" : undefined} className={`flex min-h-11 min-w-0 items-center justify-center rounded-[12px] px-0.5 text-center text-[8px] font-semibold leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] sm:px-2 sm:text-[10px] ${view === item.id ? "bg-[#355540] text-white" : "text-[#667068] hover:bg-[#eef2e9]"}`}>{item.label}</Link>)}</div>
    </nav>

    <VehicleSummary vehicle={vehicle} name={vehicleName} mileage={mileage?.mileage ?? null} />

    {view === "overview" ? <div className="space-y-4">
      <BillsCard className="bg-[linear-gradient(135deg,#edf3e9,#fffdf8)]">
        <div className="flex items-start gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#52705a]"><UiIcon name="shield" className="h-6 w-6" /></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6f8e72]">Policy status</p><StatusPill status={insurance.status} /></div><h2 className="mt-1 text-lg font-semibold text-[#20352a]">{humanStatus(insurance.status)}</h2><p className="mt-1 text-[11px] text-[#667068]">{insurance.status === "not-recorded" ? "Add your current policy details." : "Status recorded by you in DiaryDock."}</p></div></div>
      </BillsCard>
      <BillsCard><div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f0ecff] text-[#6d5ca5]"><UiIcon name="calendar" className="h-6 w-6" /></span><div><p className="text-[10px] font-semibold text-[#667068]">Renewal date</p><p className="mt-1 text-lg font-semibold text-[#20352a]">{formatDate(vehicle.insuranceRenewalDate)}</p><p className={`mt-1 text-[11px] font-semibold ${renewal.tone}`}>{renewal.label}</p></div></div></BillsCard>
      <div className="grid grid-cols-2 gap-3"><InfoTile label="Provider" value={insurance.provider || "Not recorded"} /><InfoTile label="Policy number" value={insurance.policyNumber || "Not recorded"} /><InfoTile label="Cover type" value={insurance.coverType || "Not recorded"} /><InfoTile label="Premium" value={formatMoney(insurance.premium)} /><InfoTile label="Excess" value={insurance.voluntaryExcess === null && insurance.compulsoryExcess === null ? "Not recorded" : `Voluntary ${formatMoney(insurance.voluntaryExcess)} · Compulsory ${formatMoney(insurance.compulsoryExcess)}`} /><InfoTile label="Named drivers" value={`${insurance.namedDrivers.length} recorded`} /></div>
      <BillsCard className="bg-[linear-gradient(135deg,#f1f4ea,#fffdf8)]"><div className="flex items-start gap-3"><UiIcon name="alert" className="mt-0.5 h-5 w-5 shrink-0 text-[#52705a]" /><div><p className="text-xs font-semibold text-[#20352a]">Need to make a change?</p><p className="mt-1 text-[11px] leading-5 text-[#667068]">Update your policy, keep its documents together or record a claim.</p></div></div></BillsCard>
      <BillsCard><SectionTitle title="Quick actions" detail="Choose what you need to do next" /><div className="mt-4 space-y-2"><ActionLink href={`${base}?view=documents`} icon="folder" label="View policy documents" /><ActionButton icon="car" label="Record a claim" onClick={() => { setMessage(""); setDialog("claim"); }} /><ActionLink href={insurance.providerPhone ? `tel:${insurance.providerPhone}` : `${base}?view=policy`} icon="phone" label={insurance.providerPhone ? "Contact provider" : "Add provider contact"} /><ActionButton icon="gear" label="Update policy details" onClick={openPolicy} /></div></BillsCard>
    </div> : null}

    {view === "policy" ? <div className="space-y-4">
      <BillsCard><SectionTitle title="Policy details" detail="Your current motor insurance information" action={<button type="button" onClick={openPolicy} className="min-h-11 rounded-[12px] bg-[#eef2e9] px-3 text-xs font-semibold text-[#45604d]">Update</button>} /><dl className="mt-4"><Detail label="Provider" value={insurance.provider || "Not recorded"} /><Detail label="Policy number" value={insurance.policyNumber || "Not recorded"} /><Detail label="Status" value={humanStatus(insurance.status)} /><Detail label="Cover type" value={insurance.coverType || "Not recorded"} /><Detail label="Policy start date" value={formatDate(insurance.policyStartDate)} /><Detail label="Renewal date" value={formatDate(vehicle.insuranceRenewalDate)} /><Detail label="Premium" value={formatMoney(insurance.premium)} /><Detail label="Payment method" value={insurance.paymentFrequency || "Not recorded"} /><Detail label="Voluntary excess" value={formatMoney(insurance.voluntaryExcess)} /><Detail label="Compulsory excess" value={formatMoney(insurance.compulsoryExcess)} /><Detail label="Protected no-claims bonus" value={insurance.noClaimsYears === null ? "Not recorded" : `${insurance.noClaimsYears} year${insurance.noClaimsYears === 1 ? "" : "s"}`} /><Detail label="Courtesy car" value={booleanLabel(insurance.courtesyCar)} /><Detail label="Windscreen cover" value={booleanLabel(insurance.windscreenCover)} /><Detail label="Legal expenses cover" value={booleanLabel(insurance.legalExpensesCover)} /><Detail label="Breakdown cover" value={booleanLabel(insurance.breakdownIncluded)} />{insurance.notes ? <Detail label="Policy note" value={insurance.notes} /> : null}</dl></BillsCard>
      <BillsCard><SectionTitle title="Named drivers" detail="People you have recorded on this policy" action={<button type="button" onClick={() => { setMessage(""); setDialog("driver"); }} className="min-h-11 rounded-[12px] bg-[#eef2e9] px-3 text-xs font-semibold text-[#45604d]">Add driver</button>} /><div className="mt-4 space-y-2">{insurance.namedDrivers.length ? insurance.namedDrivers.map((driver) => <div key={driver.id} className="flex min-h-[68px] items-center gap-3 rounded-[17px] border border-[#20352a]/[0.07] bg-[#faf9f4] px-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e7ebe1] text-[#52705a]"><UiIcon name="users" className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-[#20352a]">{driver.name}</span><span className="text-[10px] text-[#667068]">{driver.relationship || "Relationship not recorded"}</span></span>{driver.mainDriver ? <span className="rounded-full bg-[#e5efdf] px-2 py-1 text-[9px] font-semibold text-[#45604d]">Main driver</span> : null}</div>) : <Empty icon="users" title="No named drivers recorded" detail="Add only the people confirmed on the policy." />}</div></BillsCard>
    </div> : null}

    {view === "claims" ? <div className="space-y-4">
      <BillsCard><SectionTitle title="Claims" detail="Keep claim references, progress and evidence together" action={<button type="button" onClick={() => { setMessage(""); setDialog("claim"); }} className="min-h-11 rounded-[12px] bg-[#355540] px-3 text-xs font-semibold text-white">Add claim</button>} /><div className="mt-4 space-y-3">{insurance.claims.length ? [...insurance.claims].sort((a, b) => b.incidentDate.localeCompare(a.incidentDate)).map((claim) => <article key={claim.id} className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#faf9f4] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[#20352a]">{claim.claimType}</p><p className="mt-1 text-[10px] text-[#667068]">Incident {formatDate(claim.incidentDate)}</p></div><StatusPill status={claim.status} /></div>{claim.reference ? <p className="mt-3 text-[11px] text-[#667068]">Reference <strong className="text-[#20352a]">{claim.reference}</strong></p> : null}{claim.description ? <p className="mt-2 text-[11px] leading-5 text-[#667068]">{claim.description}</p> : null}<div className="mt-3 flex flex-wrap gap-2">{claim.documentIds.map((id) => { const document = state.vaultDocuments.find((item) => item.id === id); return document ? <Link key={id} href={`/document/${id}?from=vehicle&vehicleId=${vehicle.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-[12px] bg-white px-3 text-[10px] font-semibold text-[#45604d]"><UiIcon name="file" className="h-4 w-4" />{document.title}</Link> : null; })}</div></article>) : <Empty icon="shield" title="No claims recorded" detail="If you need it, create a private claim record and link supporting documents." />}</div></BillsCard>
      {insurance.claimsPhone ? <a href={`tel:${insurance.claimsPhone}`} className="flex min-h-[72px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white px-4"><UiIcon name="phone" className="h-5 w-5 text-[#52705a]" /><span className="flex-1"><span className="block text-xs font-semibold text-[#20352a]">Claims contact</span><span className="text-[11px] text-[#667068]">{insurance.claimsPhone}</span></span></a> : null}
    </div> : null}

    {view === "documents" ? <div className="space-y-4">
      <BillsCard><SectionTitle title="Policy documents" detail="Original files remain private in All Files" action={<Link href="/capture?room=garage" className="inline-flex min-h-11 items-center gap-1 rounded-[12px] bg-[#355540] px-3 text-xs font-semibold text-white"><UiIcon name="plus" className="h-4 w-4" />Scan</Link>} /><div className="mt-4 space-y-2">{currentDocuments.length ? currentDocuments.map((document) => <DocumentRow key={document.id} document={document} vehicleId={vehicle.id} badge="Current" />) : <Empty icon="folder" title="No current policy documents linked" detail="Scan a policy file or link an existing Garage insurance document." />}</div><button type="button" onClick={() => setDialog("documents")} className="mt-4 min-h-12 w-full rounded-[14px] border border-[#6f8e72]/30 text-xs font-semibold text-[#45604d]">Manage linked documents</button></BillsCard>
      {availableDocuments.length ? <BillsCard><SectionTitle title="Other insurance documents" detail="Insurance-related files linked to this vehicle" /><div className="mt-4 space-y-2">{availableDocuments.map((document) => <DocumentRow key={document.id} document={document} vehicleId={vehicle.id} />)}</div></BillsCard> : null}
      <BillsCard className="bg-[linear-gradient(135deg,#f1f4ea,#fffdf8)]"><SectionTitle title="Document reading" detail="DiaryDock can suggest details from scanned documents for you to check" /><div className="mt-4 space-y-2">{insuranceDocuments.filter((document) => document.extractionSummary || document.reviewStatus === "needs-review").map((document) => <Link key={document.id} href={`/document/${document.id}?from=vehicle&vehicleId=${vehicle.id}`} className="flex min-h-[68px] items-center gap-3 rounded-[16px] bg-white/80 px-3"><UiIcon name="file" className="h-5 w-5 text-[#52705a]" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-[#20352a]">{document.title}</span><span className="line-clamp-2 text-[10px] leading-4 text-[#667068]">{document.reviewStatus === "needs-review" ? "Check the suggested details against the original." : document.extractionSummary}</span></span><UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" /></Link>)}{!insuranceDocuments.some((document) => document.extractionSummary || document.reviewStatus === "needs-review") ? <p className="rounded-[15px] bg-white/70 px-4 py-3 text-[11px] leading-5 text-[#667068]">Scanned documents with suggested details will appear here for review. DiaryDock never treats extracted information as confirmed until you check it.</p> : null}</div></BillsCard>
    </div> : null}

    {view === "renewals" ? <div className="space-y-4">
      <BillsCard className="bg-[linear-gradient(135deg,#edf3e9,#fffdf8)]"><div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#52705a]"><UiIcon name="calendar" className="h-6 w-6" /></span><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6f8e72]">Next renewal</p><p className="mt-1 text-lg font-semibold text-[#20352a]">{formatDate(vehicle.insuranceRenewalDate)}</p><p className={`mt-1 text-[11px] font-semibold ${renewal.tone}`}>{renewal.label}</p></div></div></BillsCard>
      <div className="grid grid-cols-2 gap-3"><Link href="/reminders" className="flex min-h-[76px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white px-3"><UiIcon name="bell" className="h-5 w-5 text-[#52705a]" /><span className="text-xs font-semibold text-[#20352a]">Manage reminders</span></Link><button type="button" onClick={() => { setMessage(""); setRenewalDraft({ ...emptyRenewalDraft, renewalDate: vehicle.insuranceRenewalDate, provider: insurance.provider, premium: insurance.premium?.toString() ?? "" }); setDialog("renewal"); }} className="flex min-h-[76px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white px-3 text-left"><UiIcon name="plus" className="h-5 w-5 text-[#52705a]" /><span className="text-xs font-semibold text-[#20352a]">Record renewal</span></button></div>
      <BillsCard><SectionTitle title="Renewal history" detail="Quotes and renewal decisions you have recorded" /><div className="mt-4 space-y-3">{insurance.renewals.length ? [...insurance.renewals].sort((a, b) => b.renewalDate.localeCompare(a.renewalDate)).map((record) => <article key={record.id} className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#faf9f4] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[#20352a]">{formatDate(record.renewalDate)}</p><p className="mt-1 text-[10px] text-[#667068]">{record.provider || "Provider not recorded"}</p></div><StatusPill status={record.outcome} /></div><p className="mt-3 text-xs font-semibold text-[#20352a]">{formatMoney(record.premium)}</p>{record.notes ? <p className="mt-2 text-[11px] leading-5 text-[#667068]">{record.notes}</p> : null}</article>) : <Empty icon="clock" title="No renewal history recorded" detail="Record a renewal or switch when you have confirmed the details." />}</div></BillsCard>
    </div> : null}

    <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[11px] leading-5 text-[#667068]">DiaryDock helps you organise motor-insurance information, documents and reminders. It does not confirm cover or provide financial, insurance or legal advice. Always check details with your insurer.</p>

    <ModalShell open={dialog === "policy"} title="Motor insurance policy" subtitle={`Update confirmed policy details for ${vehicleName}.`} onClose={() => setDialog(null)}><form onSubmit={savePolicy} className="space-y-4"><div className="grid grid-cols-2 gap-3"><Field label="Provider" value={policyDraft.provider} onChange={(value) => setPolicyDraft((draft) => ({ ...draft, provider: value }))} /><Field label="Policy number" value={policyDraft.policyNumber} onChange={(value) => setPolicyDraft((draft) => ({ ...draft, policyNumber: value }))} /></div><label className="block text-xs font-semibold text-[#667068]">Policy status<select value={policyDraft.status} onChange={(event) => setPolicyDraft((draft) => ({ ...draft, status: event.target.value as VehicleMotorInsurance["status"] }))} className={fieldClass}><option value="not-recorded">Not recorded</option><option value="active">Active</option><option value="expired">Expired</option><option value="cancelled">Cancelled</option></select></label><div className="grid grid-cols-2 gap-3"><Field label="Start date" type="date" value={policyDraft.policyStartDate} onChange={(value) => setPolicyDraft((draft) => ({ ...draft, policyStartDate: value }))} /><Field label="Renewal date" type="date" value={policyDraft.renewalDate} onChange={(value) => setPolicyDraft((draft) => ({ ...draft, renewalDate: value }))} /></div><div className="grid grid-cols-2 gap-3"><Field label="Premium" type="number" value={policyDraft.premium} onChange={(value) => setPolicyDraft((draft) => ({ ...draft, premium: value }))} /><Field label="Payment frequency" value={policyDraft.paymentFrequency} onChange={(value) => setPolicyDraft((draft) => ({ ...draft, paymentFrequency: value }))} /></div><Field label="Cover type" value={policyDraft.coverType} onChange={(value) => setPolicyDraft((draft) => ({ ...draft, coverType: value }))} /><div className="grid grid-cols-2 gap-3"><Field label="Voluntary excess" type="number" value={policyDraft.voluntaryExcess} onChange={(value) => setPolicyDraft((draft) => ({ ...draft, voluntaryExcess: value }))} /><Field label="Compulsory excess" type="number" value={policyDraft.compulsoryExcess} onChange={(value) => setPolicyDraft((draft) => ({ ...draft, compulsoryExcess: value }))} /></div><Field label="No-claims years" type="number" value={policyDraft.noClaimsYears} onChange={(value) => setPolicyDraft((draft) => ({ ...draft, noClaimsYears: value }))} /><div className="grid grid-cols-2 gap-3"><TriField label="Courtesy car" value={policyDraft.courtesyCar} onChange={(value) => setPolicyDraft((draft) => ({ ...draft, courtesyCar: value }))} /><TriField label="Windscreen cover" value={policyDraft.windscreenCover} onChange={(value) => setPolicyDraft((draft) => ({ ...draft, windscreenCover: value }))} /><TriField label="Legal expenses" value={policyDraft.legalExpensesCover} onChange={(value) => setPolicyDraft((draft) => ({ ...draft, legalExpensesCover: value }))} /><TriField label="Breakdown included" value={policyDraft.breakdownIncluded} onChange={(value) => setPolicyDraft((draft) => ({ ...draft, breakdownIncluded: value }))} /></div><div className="grid grid-cols-2 gap-3"><Field label="Provider phone" type="tel" value={policyDraft.providerPhone} onChange={(value) => setPolicyDraft((draft) => ({ ...draft, providerPhone: value }))} /><Field label="Claims phone" type="tel" value={policyDraft.claimsPhone} onChange={(value) => setPolicyDraft((draft) => ({ ...draft, claimsPhone: value }))} /></div><Area label="Policy notes" value={policyDraft.notes} onChange={(value) => setPolicyDraft((draft) => ({ ...draft, notes: value }))} /><div className="border-t border-[#20352a]/[0.07] pt-4"><p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6f8e72]">Breakdown policy</p><div className="space-y-4"><Field label="Provider" value={policyDraft.breakdownProvider} onChange={(value) => setPolicyDraft((draft) => ({ ...draft, breakdownProvider: value }))} /><Field label="Policy number" value={policyDraft.breakdownPolicyNumber} onChange={(value) => setPolicyDraft((draft) => ({ ...draft, breakdownPolicyNumber: value }))} /><Field label="Renewal date" type="date" value={policyDraft.breakdownRenewalDate} onChange={(value) => setPolicyDraft((draft) => ({ ...draft, breakdownRenewalDate: value }))} /></div></div><Submit label="Save policy details" /></form></ModalShell>

    <ModalShell open={dialog === "driver"} title="Add named driver" subtitle="Record a person confirmed on the policy." onClose={() => { setDialog(null); setMessage(""); }}>{message ? <Alert text={message} /> : null}<form onSubmit={saveDriver} className="space-y-4"><Field label="Driver name" value={driverDraft.name} onChange={(value) => setDriverDraft((draft) => ({ ...draft, name: value }))} /><Field label="Relationship" value={driverDraft.relationship} onChange={(value) => setDriverDraft((draft) => ({ ...draft, relationship: value }))} /><label className="flex min-h-11 items-center gap-3 rounded-[14px] border border-[#20352a]/10 bg-[#faf9f4] px-3 text-sm text-[#20352a]"><input type="checkbox" checked={driverDraft.mainDriver} onChange={(event) => setDriverDraft((draft) => ({ ...draft, mainDriver: event.target.checked }))} className="h-4 w-4 accent-[#45604d]" />Main driver</label><Area label="Notes" value={driverDraft.notes} onChange={(value) => setDriverDraft((draft) => ({ ...draft, notes: value }))} /><Submit label="Add named driver" /></form></ModalShell>

    <ModalShell open={dialog === "claim"} title="Record a claim" subtitle="Keep information and evidence together. Contact your insurer directly to submit a claim." onClose={() => { setDialog(null); setMessage(""); }}>{message ? <Alert text={message} /> : null}<form onSubmit={saveClaim} className="space-y-4"><div className="grid grid-cols-2 gap-3"><Field label="Incident date" type="date" value={claimDraft.incidentDate} onChange={(value) => setClaimDraft((draft) => ({ ...draft, incidentDate: value }))} /><Field label="Claim type" value={claimDraft.claimType} onChange={(value) => setClaimDraft((draft) => ({ ...draft, claimType: value }))} /></div><label className="block text-xs font-semibold text-[#667068]">Status<select value={claimDraft.status} onChange={(event) => setClaimDraft((draft) => ({ ...draft, status: event.target.value as VehicleInsuranceClaim["status"] }))} className={fieldClass}><option value="draft">Draft</option><option value="submitted">Submitted</option><option value="in-progress">In progress</option><option value="settled">Settled</option><option value="closed">Closed</option></select></label><Field label="Claim reference" value={claimDraft.reference} onChange={(value) => setClaimDraft((draft) => ({ ...draft, reference: value }))} /><Area label="What happened?" value={claimDraft.description} onChange={(value) => setClaimDraft((draft) => ({ ...draft, description: value }))} /><DocumentSelect label="Supporting document" value={claimDraft.documentId} documents={insuranceDocuments} onChange={(value) => setClaimDraft((draft) => ({ ...draft, documentId: value }))} /><Submit label="Save claim record" /></form></ModalShell>

    <ModalShell open={dialog === "renewal"} title="Record a renewal" subtitle="Save a confirmed quote or renewal decision." onClose={() => { setDialog(null); setMessage(""); }}>{message ? <Alert text={message} /> : null}<form onSubmit={saveRenewal} className="space-y-4"><Field label="Renewal date" type="date" value={renewalDraft.renewalDate} onChange={(value) => setRenewalDraft((draft) => ({ ...draft, renewalDate: value }))} /><div className="grid grid-cols-2 gap-3"><Field label="Provider" value={renewalDraft.provider} onChange={(value) => setRenewalDraft((draft) => ({ ...draft, provider: value }))} /><Field label="Premium" type="number" value={renewalDraft.premium} onChange={(value) => setRenewalDraft((draft) => ({ ...draft, premium: value }))} /></div><label className="block text-xs font-semibold text-[#667068]">Outcome<select value={renewalDraft.outcome} onChange={(event) => setRenewalDraft((draft) => ({ ...draft, outcome: event.target.value as VehicleInsuranceRenewal["outcome"] }))} className={fieldClass}><option value="upcoming">Upcoming</option><option value="renewed">Renewed</option><option value="switched">Switched provider</option><option value="cancelled">Cancelled</option></select></label><Area label="Notes" value={renewalDraft.notes} onChange={(value) => setRenewalDraft((draft) => ({ ...draft, notes: value }))} /><DocumentSelect label="Renewal document" value={renewalDraft.documentId} documents={insuranceDocuments} onChange={(value) => setRenewalDraft((draft) => ({ ...draft, documentId: value }))} /><Submit label="Save renewal" /></form></ModalShell>

    <ModalShell open={dialog === "documents"} title="Policy documents" subtitle="Choose which existing Garage insurance files belong to the current policy." onClose={() => setDialog(null)}><div className="space-y-2">{insuranceDocuments.length ? insuranceDocuments.map((document) => { const checked = currentDocumentIds.has(document.id); return <label key={document.id} className="flex min-h-[64px] cursor-pointer items-center gap-3 rounded-[16px] border border-[#20352a]/[0.07] bg-[#faf9f4] px-3"><input type="checkbox" checked={checked} onChange={() => togglePolicyDocument(document.id)} className="h-4 w-4 accent-[#45604d]" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-[#20352a]">{document.title}</span><span className="text-[10px] text-[#667068]">{document.kind} · {document.updated}</span></span></label>; }) : <Empty icon="folder" title="No insurance documents found" detail="Scan a document first, then return here to link it." />}</div><Link href="/capture?room=garage" className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-[#355540] text-xs font-semibold text-white"><UiIcon name="plus" className="h-4 w-4" />Scan insurance document</Link></ModalShell>
  </div>;
}

function VehicleSummary({ vehicle, name, mileage }: { vehicle: VehicleRecord; name: string; mileage: number | null }) {
  return <section className="flex min-h-[92px] items-center gap-4 rounded-[22px] border border-[#20352a]/[0.08] bg-[#fffdf8] p-3 shadow-sm"><span className="flex h-[68px] w-[92px] shrink-0 items-center justify-center rounded-[16px] bg-[#e8ede3] text-[#526b52]"><UiIcon name="car" className="h-9 w-9" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#20352a]">{name}</p><p className="mt-1 truncate text-[11px] text-[#667068]">{[vehicle.registration || "No registration", vehicle.year?.toString(), vehicle.fuelType, mileage === null ? "Mileage not recorded" : `${mileage.toLocaleString("en-GB")} miles`].filter(Boolean).join(" · ")}</p></div></section>;
}

function SectionTitle({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) { return <div className="flex items-start justify-between gap-3"><div><h2 className="text-[16px] font-semibold text-[#20352a]">{title}</h2><p className="mt-1 text-[11px] leading-5 text-[#667068]">{detail}</p></div>{action}</div>; }
function InfoTile({ label, value }: { label: string; value: string }) { return <div className="min-h-[82px] rounded-[18px] border border-[#20352a]/[0.07] bg-white p-3"><p className="text-[10px] font-medium text-[#667068]">{label}</p><p className="mt-2 break-words text-xs font-semibold leading-5 text-[#20352a]">{value}</p></div>; }
function Detail({ label, value }: { label: string; value: string }) { return <div className="flex min-h-11 items-center justify-between gap-4 border-b border-[#20352a]/[0.06] py-2.5 last:border-0"><dt className="text-xs text-[#667068]">{label}</dt><dd className="max-w-[60%] text-right text-xs font-semibold text-[#20352a]">{value}</dd></div>; }
function StatusPill({ status }: { status: string }) { const positive = ["active", "settled", "closed", "renewed"].includes(status); const attention = ["expired", "cancelled"].includes(status); return <span className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${positive ? "bg-[#e5efdf] text-[#45604d]" : attention ? "bg-[#fbe5df] text-[#a4473d]" : "bg-[#f1ecdf] text-[#806b45]"}`}>{humanStatus(status)}</span>; }
function ActionLink({ href, icon, label }: { href: string; icon: IconName; label: string }) { return <Link href={href} className="flex min-h-12 items-center gap-3 rounded-[14px] border border-[#20352a]/[0.07] bg-[#faf9f4] px-3 text-xs font-semibold text-[#20352a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"><UiIcon name={icon} className="h-4 w-4 text-[#52705a]" /><span className="flex-1">{label}</span><UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" /></Link>; }
function ActionButton({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="flex min-h-12 w-full items-center gap-3 rounded-[14px] border border-[#20352a]/[0.07] bg-[#faf9f4] px-3 text-left text-xs font-semibold text-[#20352a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"><UiIcon name={icon} className="h-4 w-4 text-[#52705a]" /><span className="flex-1">{label}</span><UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" /></button>; }
function DocumentRow({ document, vehicleId, badge }: { document: { id: string; title: string; kind: string; updated: string }; vehicleId: string; badge?: string }) { return <Link href={`/document/${document.id}?from=vehicle&vehicleId=${vehicleId}`} className="flex min-h-[72px] items-center gap-3 rounded-[17px] border border-[#20352a]/[0.07] bg-[#faf9f4] px-3"><span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white text-[#52705a]"><UiIcon name="file" className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-[#20352a]">{document.title}</span><span className="text-[10px] text-[#667068]">{document.kind} · {document.updated}</span></span>{badge ? <span className="rounded-full bg-[#e5efdf] px-2 py-1 text-[9px] font-semibold text-[#45604d]">{badge}</span> : null}<UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" /></Link>; }
function Empty({ icon, title, detail }: { icon: IconName; title: string; detail: string }) { return <div className="rounded-[18px] border border-dashed border-[#6f8e72]/35 bg-[#f7f7f1] px-5 py-8 text-center"><UiIcon name={icon} className="mx-auto h-6 w-6 text-[#6f8e72]" /><p className="mt-3 text-sm font-semibold text-[#20352a]">{title}</p><p className="mt-1 text-[11px] leading-5 text-[#667068]">{detail}</p></div>; }
function Alert({ text }: { text: string }) { return <p role="alert" className="mb-3 rounded-[12px] bg-[#fbe5df] p-3 text-xs text-[#a4473d]">{text}</p>; }
function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: "text" | "date" | "number" | "tel" }) { return <label className="block text-xs font-semibold text-[#667068]">{label}<input type={type} min={type === "number" ? "0" : undefined} step={type === "number" ? "any" : undefined} value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass} /></label>; }
function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-xs font-semibold text-[#667068]">{label}<textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} className={`${fieldClass} resize-y`} /></label>; }
function TriField({ label, value, onChange }: { label: string; value: TriState; onChange: (value: TriState) => void }) { return <label className="block text-xs font-semibold text-[#667068]">{label}<select value={value} onChange={(event) => onChange(event.target.value as TriState)} className={fieldClass}><option value="unknown">Not recorded</option><option value="yes">Included</option><option value="no">Not included</option></select></label>; }
function DocumentSelect({ label, value, documents, onChange }: { label: string; value: string; documents: { id: string; title: string }[]; onChange: (value: string) => void }) { return <label className="block text-xs font-semibold text-[#667068]">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass}><option value="">None</option>{documents.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}</select></label>; }
function Submit({ label }: { label: string }) { return <button type="submit" className="min-h-12 w-full rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white">{label}</button>; }
