import type {
  OfficeBillsSnapshot,
  OfficeContactsSnapshot,
  OfficeContractsSnapshot,
  OfficeCorrespondenceSnapshot,
  OfficeInsuranceSnapshot,
} from "@diarydock/office";

import officeImage from "../../../../public/images/pages/office-hero.webp";
import { effectiveOfficeBillStatus, formatOfficeMoney } from "./office-bills-format";

export type OfficeArea = "bills" | "insurance" | "contracts" | "correspondence" | "contacts";

type Props = {
  area: OfficeArea;
  bills: OfficeBillsSnapshot | null;
  contacts: OfficeContactsSnapshot | null;
  contracts: OfficeContractsSnapshot | null;
  correspondence: OfficeCorrespondenceSnapshot | null;
  insurance: OfficeInsuranceSnapshot | null;
  syncStatus: string;
  onAdd: () => void;
  onArea: (area: OfficeArea) => void;
  onBack: () => void;
  onOpenSafeRoom: () => void;
  onScan: () => void;
};

function billTotals(snapshot: OfficeBillsSnapshot | null) {
  const active = (snapshot?.bills ?? [])
    .filter((bill) => effectiveOfficeBillStatus(bill) === "active");
  const monthly = active.reduce((sum, bill) => {
    if (bill.frequency === "monthly") return sum + bill.amount;
    if (bill.frequency === "quarterly") return sum + bill.amount / 3;
    return bill.frequency === "annual" ? sum + bill.amount / 12 : sum;
  }, 0);
  return [
    [String(active.length), "active bills"],
    [formatOfficeMoney(monthly), "monthly equivalent"],
    [String((snapshot?.bills ?? []).filter((bill) => bill.reviewStatus === "needs-review").length), "to check"],
  ];
}

function insuranceTotals(snapshot: OfficeInsuranceSnapshot | null) {
  const active = (snapshot?.policies ?? []).filter((policy) => policy.status === "active");
  const monthly = active.reduce((sum, policy) => {
    if (policy.premiumFrequency === "monthly") return sum + policy.premium;
    return policy.premiumFrequency === "annual" ? sum + policy.premium / 12 : sum;
  }, 0);
  const claims = (snapshot?.claims ?? []).filter((claim) => !["settled", "closed"]
    .includes(claim.status)).length;
  return [[String(active.length), "active policies"], [formatOfficeMoney(monthly), "monthly equivalent"],
    [String(claims), "active claims"]];
}

function contractTotals(snapshot: OfficeContractsSnapshot | null) {
  const active = (snapshot?.contracts ?? []).filter((contract) => contract.status === "active");
  const monthly = active.reduce((sum, contract) => {
    if (contract.frequency === "annual") return sum + contract.cost / 12;
    if (contract.frequency === "quarterly") return sum + contract.cost / 3;
    return contract.frequency === "monthly" ? sum + contract.cost : sum;
  }, 0);
  return [[String(active.length), "active contracts"], [formatOfficeMoney(monthly), "monthly equivalent"],
    [String((snapshot?.contracts ?? []).filter((item) => item.reviewStatus === "needs-review").length), "to check"]];
}

function correspondenceTotals(snapshot: OfficeCorrespondenceSnapshot | null) {
  const records = snapshot?.correspondence ?? [];
  return [
    [String(records.filter((item) => item.status === "unread").length), "unread"],
    [String(records.filter((item) => item.status === "action-needed").length), "awaiting action"],
    [String(records.filter((item) => item.reviewStatus === "needs-review").length), "to check"],
  ];
}

function contactTotals(snapshot: OfficeContactsSnapshot | null) {
  const contacts = snapshot?.contacts ?? [];
  const now = Date.now();
  const upcoming = contacts.flatMap((contact) => contact.meetings)
    .filter((meeting) => !meeting.completed
      && Date.parse(`${meeting.date}T${meeting.time || "12:00"}:00`) >= now).length;
  return [
    [String(contacts.length), "contacts"],
    [String(contacts.filter((item) => item.isFavourite).length), "favourites"],
    [String(upcoming), "upcoming meetings"],
  ];
}

export function OfficeOverview(props: Props) {
  const totals = props.area === "bills" ? billTotals(props.bills)
    : props.area === "insurance" ? insuranceTotals(props.insurance)
      : props.area === "contracts" ? contractTotals(props.contracts)
        : props.area === "correspondence" ? correspondenceTotals(props.correspondence)
          : contactTotals(props.contacts);
  const addLabel = props.area === "bills" ? "a bill" : props.area === "insurance"
    ? "a policy" : props.area === "contracts" ? "a contract"
      : props.area === "correspondence" ? "correspondence" : "a contact";
  const areas: Array<[OfficeArea, string]> = [
    ["bills", "Bills"], ["insurance", "Insurance"],
    ["contracts", "Contracts"], ["correspondence", "Letters"],
    ["contacts", "Contacts"],
  ];
  return <>
    <header className="office-hero" style={{ backgroundImage: `url(${officeImage})` }}>
      <div className="office-hero-shade" />
      <button className="office-back" type="button" onClick={props.onBack}
        aria-label="Back to the estate map">‹</button>
      <span className={`sync-pill sync-${props.syncStatus.toLowerCase()}`}>
        {props.syncStatus.toLowerCase().replaceAll("_", " ")}</span>
      <div className="office-heading"><p>Household administration</p><h1>Office</h1>
        <strong>Keep bills, policies and household records clear.</strong></div>
    </header>
    <section className="office-sheet">
      <div className="office-totals">{totals.map(([value, label]) =>
        <span key={label}><strong>{value}</strong>{label}</span>)}</div>
      <div className="office-tabs" aria-label="Office area">{areas.map(([value, label]) =>
        <button type="button" key={value} className={props.area === value ? "active" : ""}
          onClick={() => props.onArea(value)}>{label}</button>)}</div>
      <div className="office-actions">
        <button type="button" onClick={props.onAdd}>＋ Add {addLabel}</button>
        <button type="button" onClick={props.onScan}>Scan into Office</button>
        <button className="office-safe-room" type="button" onClick={props.onOpenSafeRoom}>
          Open Safe Room · Wills & wishes
        </button>
      </div>
    </section>
  </>;
}
