import { useState } from "react";

import type {
  OfficeBill,
  OfficeContact,
  OfficeContract,
  OfficeCorrespondence,
  OfficeInsuranceClaim,
  OfficeInsurancePolicy,
  SaveOfficeBill,
  SaveOfficeContact,
  SaveOfficeContract,
  SaveOfficeCorrespondence,
  SaveOfficeInsuranceClaim,
  SaveOfficeInsurancePolicy,
} from "@diarydock/office";

import { useDocuments } from "@mobile/files/use-documents";
import { useReminders } from "@mobile/reminders/use-reminders";
import { officeContactName } from "./contact-ui";
import { formatOfficeDate, formatOfficeMoney } from "./office-bills-format";
import type { OfficeScreenProps } from "./office-screen-types";
import { useOfficeBills } from "./use-office-bills";
import { useOfficeContacts } from "./use-office-contacts";
import { useOfficeContracts } from "./use-office-contracts";
import { useOfficeCorrespondence } from "./use-office-correspondence";
import { useOfficeInsurance } from "./use-office-insurance";

export function useOfficeWorkspace(props: OfficeScreenProps) {
  const billsState = useOfficeBills(props);
  const insurance = useOfficeInsurance(props);
  const contracts = useOfficeContracts(props);
  const correspondence = useOfficeCorrespondence(props);
  const contacts = useOfficeContacts(props);
  const reminders = useReminders(props.store, props.syncStatus, props.synchronize);
  const documents = useDocuments(props.store, props.syncStatus, props.synchronize);
  const [area, setArea] = useState(props.initialArea ?? "bills");
  const [selectedBill, setSelectedBill] = useState<OfficeBill | null | undefined>();
  const [selectedPolicy, setSelectedPolicy] = useState<OfficeInsurancePolicy | null | undefined>();
  const [selectedClaim, setSelectedClaim] = useState<OfficeInsuranceClaim | null | undefined>();
  const [selectedContract, setSelectedContract] = useState<OfficeContract | null | undefined>();
  const [selectedCorrespondence, setSelectedCorrespondence]
    = useState<OfficeCorrespondence | null | undefined>();
  const [selectedContact, setSelectedContact] = useState<OfficeContact | null | undefined>();
  const [importingContacts, setImportingContacts] = useState(false);
  const bills = billsState.snapshot?.bills ?? [];

  async function saveBill(bill: SaveOfficeBill) {
    const saved = await billsState.mutate({
      operation: "SAVE_BILL", billId: selectedBill?.id ?? null, bill,
    });
    if (saved) setSelectedBill(undefined);
    return saved;
  }

  async function editBill(bill: OfficeBill) {
    const complete = await billsState.loadBill(bill.id);
    if (complete) setSelectedBill(complete);
  }

  async function addBillReminder(bill: SaveOfficeBill) {
    const title = bill.title || `${bill.provider} bill`;
    await reminders.create({
      title: `Pay ${title}`,
      note: `Amount recorded: ${formatOfficeMoney(bill.amount)}. Check the original bill before paying.`,
      roomId: "office", roomName: "Office", group: "later",
      timeLabel: formatOfficeDate(bill.dueDate), priority: "normal",
      documentId: selectedBill?.documentId ?? undefined, documentTitle: title,
      dueAt: `${bill.dueDate}T09:00:00`, timeZone: "Europe/London",
    });
  }

  async function savePolicy(policy: SaveOfficeInsurancePolicy) {
    const saved = await insurance.mutate({
      operation: "SAVE_POLICY", policyId: selectedPolicy?.id ?? null, policy,
    });
    if (saved) setSelectedPolicy(undefined);
    return saved;
  }

  async function editPolicy(policy: OfficeInsurancePolicy) {
    const complete = await insurance.loadPolicy(policy.id);
    if (complete) setSelectedPolicy(complete);
  }

  async function addPolicyReminder(policy: SaveOfficeInsurancePolicy) {
    const title = policy.title || `${policy.provider} policy`;
    await reminders.create({
      title: `Review ${title}`,
      note: "Check the renewal quote, cover and exclusions against the original policy document.",
      roomId: "office", roomName: "Office", group: "later",
      timeLabel: formatOfficeDate(policy.renewalDate), priority: "normal",
      documentId: selectedPolicy?.documentId ?? undefined, documentTitle: title,
      dueAt: `${policy.renewalDate}T09:00:00`, timeZone: "Europe/London",
    });
  }

  async function saveClaim(claim: SaveOfficeInsuranceClaim) {
    const saved = await insurance.mutate({
      operation: "SAVE_CLAIM", claimId: selectedClaim?.id ?? null, claim,
    });
    if (saved) setSelectedClaim(undefined);
    return saved;
  }

  async function editClaim(claim: OfficeInsuranceClaim) {
    const complete = await insurance.loadClaim(claim.id);
    if (complete) setSelectedClaim(complete);
  }

  async function saveContract(contract: SaveOfficeContract) {
    const saved = await contracts.mutate({
      operation: "SAVE_CONTRACT", contractId: selectedContract?.id ?? null, contract,
    });
    if (saved) setSelectedContract(undefined);
    return saved;
  }

  async function editContract(contract: OfficeContract) {
    const complete = await contracts.loadContract(contract.id);
    if (complete) setSelectedContract(complete);
  }

  async function addContractReminder(contract: SaveOfficeContract) {
    const title = contract.serviceName || `${contract.provider} contract`;
    await reminders.create({
      title: `Review ${title}`,
      note: "Check the price, renewal and notice terms against the original contract.",
      roomId: "office", roomName: "Office", group: "later",
      timeLabel: formatOfficeDate(contract.renewalDate), priority: "normal",
      documentId: selectedContract?.documentId ?? undefined, documentTitle: title,
      dueAt: `${contract.renewalDate}T09:00:00`, timeZone: "Europe/London",
    });
  }

  async function saveCorrespondence(item: SaveOfficeCorrespondence) {
    const saved = await correspondence.mutate({
      operation: "SAVE_CORRESPONDENCE",
      correspondenceId: selectedCorrespondence?.id ?? null,
      correspondence: item,
    });
    if (saved) setSelectedCorrespondence(undefined);
    return saved;
  }

  async function editCorrespondence(item: OfficeCorrespondence) {
    const complete = await correspondence.loadCorrespondence(item.id);
    if (complete) setSelectedCorrespondence(complete);
  }

  async function addCorrespondenceReminder(item: SaveOfficeCorrespondence) {
    if (!item.deadline) return null;
    const id = crypto.randomUUID();
    const title = item.title || `${item.sender} correspondence`;
    const saved = await reminders.createWithId(id, {
      title: `Respond to ${title}`,
      note: item.summary || "Check the required action against the original correspondence.",
      roomId: "office", roomName: "Office", group: "later",
      timeLabel: formatOfficeDate(item.deadline), priority: "normal",
      documentId: selectedCorrespondence?.documentId ?? undefined,
      documentTitle: title, dueAt: `${item.deadline}T09:00:00`, timeZone: "Europe/London",
    });
    return saved ? id : null;
  }

  async function saveContact(contact: SaveOfficeContact) {
    const previousIds = new Set(selectedContact?.meetings.map((item) => item.id) ?? []);
    const saved = await contacts.mutate({
      operation: "SAVE_CONTACT", contactId: selectedContact?.id ?? null, contact,
    });
    if (!saved) return false;
    const name = officeContactName(contact);
    for (const meeting of contact.meetings) {
      if (previousIds.has(meeting.id) || meeting.completed) continue;
      await reminders.createWithId(meeting.id, {
        title: `${meeting.title} · ${name}`,
        note: meeting.notes || `${contact.role || contact.category}${
          contact.company ? ` at ${contact.company}` : ""}`,
        roomId: "office", roomName: "Office", group: "later",
        timeLabel: `${formatOfficeDate(meeting.date)}${meeting.time ? `, ${meeting.time}` : ""}`,
        priority: "normal", dueAt: `${meeting.date}T${meeting.time || "09:00"}:00`,
        timeZone: "Europe/London",
      });
    }
    setSelectedContact(undefined);
    return true;
  }

  async function editContact(contact: OfficeContact) {
    const complete = await contacts.loadContact(contact.id);
    if (complete) setSelectedContact(complete);
  }

  async function deleteContact(contact: OfficeContact) {
    if (!window.confirm(`Delete ${officeContactName(contact)}? Linked records will remain.`)) {
      return false;
    }
    const saved = await contacts.mutate({ operation: "DELETE_CONTACT", contactId: contact.id });
    if (saved) setSelectedContact(undefined);
    return saved;
  }

  async function importContacts(items: SaveOfficeContact[]) {
    const saved = await contacts.mutate({ operation: "IMPORT_CONTACTS", contacts: items });
    if (saved) setImportingContacts(false);
    return saved;
  }

  function addRecord() {
    if (area === "bills") setSelectedBill(null);
    else if (area === "insurance") setSelectedPolicy(null);
    else if (area === "contracts") setSelectedContract(null);
    else if (area === "correspondence") setSelectedCorrespondence(null);
    else setSelectedContact(null);
  }

  const activeMessage = area === "bills" ? billsState.message
    : area === "insurance" ? insurance.message
      : area === "contracts" ? contracts.message
        : area === "correspondence" ? correspondence.message : contacts.message;

  return {
    activeMessage, addBillReminder, addContractReminder, addCorrespondenceReminder,
    addPolicyReminder, addRecord, area, bills, billsState, contacts, contracts,
    correspondence, deleteContact, documents, editBill, editClaim, editContract,
    editContact, editCorrespondence, editPolicy,
    importContacts, importingContacts,
    insurance, reminders, saveBill, saveClaim, saveContact, saveContract,
    saveCorrespondence, savePolicy, selectedBill, selectedClaim, selectedContact,
    selectedContract, selectedCorrespondence, selectedPolicy, setArea, setImportingContacts,
    setSelectedBill, setSelectedClaim, setSelectedContact, setSelectedContract,
    setSelectedCorrespondence, setSelectedPolicy,
  };
}

export type OfficeWorkspace = ReturnType<typeof useOfficeWorkspace>;
