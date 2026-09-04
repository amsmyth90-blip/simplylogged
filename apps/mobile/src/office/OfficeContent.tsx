import { BillsList } from "./BillsList";
import { ContactsPanel } from "./ContactsPanel";
import { ContractsPanel } from "./ContractsPanel";
import { CorrespondencePanel } from "./CorrespondencePanel";
import { InsurancePanel } from "./InsurancePanel";
import type { OfficeWorkspace } from "./use-office-workspace";

export function OfficeContent({ office }: { office: OfficeWorkspace }) {
  return <section className="office-content">
    {office.area === "bills" ? <>
      <div className="office-section-heading"><div><p>Bills and payments</p><h2>Your bills</h2></div>
        <button type="button" onClick={() => void office.billsState.refresh()}>Refresh</button></div>
      {office.billsState.loading && !office.billsState.snapshot
        ? <p className="office-empty">Opening the encrypted Office copy…</p>
        : <BillsList bills={office.bills} loadingBillId={office.billsState.loadingBillId}
            onEdit={office.editBill} />}
    </> : office.area === "insurance" ? office.insurance.loading && !office.insurance.snapshot
      ? <p className="office-empty">Opening the encrypted insurance copy…</p>
      : <InsurancePanel snapshot={office.insurance.snapshot}
          loadingClaimId={office.insurance.loadingClaimId}
          loadingPolicyId={office.insurance.loadingPolicyId}
          onEditClaim={(claim) => claim ? void office.editClaim(claim) : office.setSelectedClaim(null)}
          onEditPolicy={(policy) => policy ? office.editPolicy(policy) : office.setSelectedPolicy(null)} />
    : office.area === "contracts" ? office.contracts.loading && !office.contracts.snapshot
      ? <p className="office-empty">Opening the encrypted contracts copy…</p>
      : <><div className="office-section-heading"><div><p>Services and subscriptions</p>
          <h2>Your contracts</h2></div><button type="button"
            onClick={() => void office.contracts.refresh()}>Refresh</button></div>
          <ContractsPanel contracts={office.contracts.snapshot?.contracts ?? []}
            loadingContractId={office.contracts.loadingContractId}
            onEdit={office.editContract} /></>
    : office.area === "correspondence"
      ? office.correspondence.loading && !office.correspondence.snapshot
        ? <p className="office-empty">Opening the encrypted correspondence copy…</p>
        : <><div className="office-section-heading"><div><p>Letters and notices</p>
            <h2>Important correspondence</h2></div><button type="button"
              onClick={() => void office.correspondence.refresh()}>Refresh</button></div>
            <CorrespondencePanel correspondence={office.correspondence.snapshot?.correspondence ?? []}
              loadingCorrespondenceId={office.correspondence.loadingCorrespondenceId}
              onEdit={office.editCorrespondence} /></>
      : office.contacts.loading && !office.contacts.snapshot
        ? <p className="office-empty">Opening the encrypted contacts copy…</p>
        : <><div className="office-section-heading"><div><p>Private directory</p>
            <h2>Professional contacts</h2></div><button type="button"
              onClick={() => void office.contacts.refresh()}>Refresh</button></div>
            <ContactsPanel contacts={office.contacts.snapshot?.contacts ?? []}
              loadingContactId={office.contacts.loadingContactId}
              onEdit={office.editContact} onImport={() => office.setImportingContacts(true)} /></>}
    {office.activeMessage || office.reminders.error || office.documents.error
      ? <p className="office-message" role="status">
          {office.activeMessage ?? office.reminders.error ?? office.documents.error}
        </p> : null}
  </section>;
}
