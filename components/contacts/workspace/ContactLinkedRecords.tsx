"use client";

import {
  BillsCard,
  BillsSectionTitle,
  fieldClass,
} from "@/components/bills/BillsUi";

import type { ContactDetailController } from "./useContactDetail";

export function ContactLinkedRecords({
  controller,
}: {
  controller: ContactDetailController;
}) {
  const { state, draft, addLinked } = controller;
  if (!draft) return null;
  return (
    <BillsCard>
      <BillsSectionTitle
        icon="folder"
        title="Linked information"
        detail="Links organise records together; they do not change access permissions"
      />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-[#667068]">
          Documents ({draft.linkedDocumentIds.length})
          <select
            defaultValue=""
            onChange={(event) => {
              addLinked("linkedDocumentIds", event.target.value);
              event.target.value = "";
            }}
            className={fieldClass}
          >
            <option value="">Link a document…</option>
            {state.vaultDocuments
              .filter((item) => !draft.linkedDocumentIds.includes(item.id))
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Policies ({draft.linkedPolicyIds.length})
          <select
            defaultValue=""
            onChange={(event) => {
              addLinked("linkedPolicyIds", event.target.value);
              event.target.value = "";
            }}
            className={fieldClass}
          >
            <option value="">Link a policy…</option>
            {state.insurance.policies
              .filter((item) => !draft.linkedPolicyIds.includes(item.id))
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title || item.provider}
                </option>
              ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Contracts ({draft.linkedContractIds.length})
          <select
            defaultValue=""
            onChange={(event) => {
              addLinked("linkedContractIds", event.target.value);
              event.target.value = "";
            }}
            className={fieldClass}
          >
            <option value="">Link a contract…</option>
            {state.contracts.contracts
              .filter((item) => !draft.linkedContractIds.includes(item.id))
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.serviceName || item.provider}
                </option>
              ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Bills ({draft.linkedBillIds.length})
          <select
            defaultValue=""
            onChange={(event) => {
              addLinked("linkedBillIds", event.target.value);
              event.target.value = "";
            }}
            className={fieldClass}
          >
            <option value="">Link a bill…</option>
            {state.bills.bills
              .filter((item) => !draft.linkedBillIds.includes(item.id))
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title || item.provider}
                </option>
              ))}
          </select>
        </label>
      </div>
    </BillsCard>
  );
}
