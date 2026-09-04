import { BillEditor } from "./BillEditor";
import { ContactEditor } from "./ContactEditor";
import { ContactImport } from "./ContactImport";
import { ContractEditor } from "./ContractEditor";
import { CorrespondenceEditor } from "./CorrespondenceEditor";
import { InsuranceClaimEditor } from "./InsuranceClaimEditor";
import { InsurancePolicyEditor } from "./InsurancePolicyEditor";
import type { OfficeWorkspace } from "./use-office-workspace";

export function OfficeEditors({ office }: { office: OfficeWorkspace }) {
  return <>
    {office.selectedBill !== undefined ? <BillEditor
      key={office.selectedBill?.id ?? "new"} bill={office.selectedBill}
      busy={office.billsState.busy} onAddReminder={office.addBillReminder}
      onCancel={() => office.setSelectedBill(undefined)} onSave={office.saveBill} /> : null}
    {office.selectedPolicy !== undefined ? <InsurancePolicyEditor
      key={office.selectedPolicy?.id ?? "new-policy"} busy={office.insurance.busy}
      policy={office.selectedPolicy} onAddReminder={office.addPolicyReminder}
      onCancel={() => office.setSelectedPolicy(undefined)} onSave={office.savePolicy} /> : null}
    {office.selectedClaim !== undefined ? <InsuranceClaimEditor
      key={office.selectedClaim?.id ?? "new-claim"} busy={office.insurance.busy}
      claim={office.selectedClaim} policies={office.insurance.snapshot?.policies ?? []}
      onCancel={() => office.setSelectedClaim(undefined)} onSave={office.saveClaim} /> : null}
    {office.selectedContract !== undefined ? <ContractEditor
      key={office.selectedContract?.id ?? "new-contract"} busy={office.contracts.busy}
      contract={office.selectedContract} onAddReminder={office.addContractReminder}
      onCancel={() => office.setSelectedContract(undefined)} onSave={office.saveContract} /> : null}
    {office.selectedCorrespondence !== undefined ? <CorrespondenceEditor
      key={office.selectedCorrespondence?.id ?? "new-correspondence"} bills={office.bills}
      busy={office.correspondence.busy} correspondence={office.selectedCorrespondence}
      policies={office.insurance.snapshot?.policies ?? []}
      onAddReminder={office.addCorrespondenceReminder}
      onCancel={() => office.setSelectedCorrespondence(undefined)}
      onSave={office.saveCorrespondence} /> : null}
    {office.selectedContact !== undefined ? <ContactEditor
      key={office.selectedContact?.id ?? "new-contact"} bills={office.bills}
      busy={office.contacts.busy} contact={office.selectedContact}
      contracts={office.contracts.snapshot?.contracts ?? []}
      documents={office.documents.documents} policies={office.insurance.snapshot?.policies ?? []}
      onCancel={() => office.setSelectedContact(undefined)} onDelete={office.deleteContact}
      onSave={office.saveContact} /> : null}
    {office.importingContacts ? <ContactImport busy={office.contacts.busy}
      onCancel={() => office.setImportingContacts(false)} onImport={office.importContacts} /> : null}
  </>;
}
