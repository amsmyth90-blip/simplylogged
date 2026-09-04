"use client";
import { fieldClass } from "@/components/bills/BillsUi";
import {
  contractCategories,
  type ContractRecord,
  type ContractStatus,
} from "@/lib/contract-records";
import type { ContractDetailController } from "./useContractDetail";

export function ContractOverviewFields({
  controller,
}: {
  controller: ContractDetailController;
}) {
  const { draft, update } = controller;
  if (!draft) return null;
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="text-xs font-semibold text-[#667068]">
        Service name
        <input
          value={draft.serviceName}
          onChange={(event) => update("serviceName", event.target.value)}
          className={fieldClass}
        />
      </label>
      <label className="text-xs font-semibold text-[#667068]">
        Provider
        <input
          value={draft.provider}
          onChange={(event) => update("provider", event.target.value)}
          className={fieldClass}
        />
      </label>
      <label className="text-xs font-semibold text-[#667068]">
        Category
        <select
          value={draft.category}
          onChange={(event) =>
            update("category", event.target.value as ContractRecord["category"])
          }
          className={fieldClass}
        >
          {contractCategories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label className="text-xs font-semibold text-[#667068]">
        Status
        <select
          value={draft.status}
          onChange={(event) =>
            update("status", event.target.value as ContractStatus)
          }
          className={fieldClass}
        >
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
      </label>
      <label className="text-xs font-semibold text-[#667068]">
        Account email
        <input
          type="email"
          value={draft.accountEmail}
          onChange={(event) => update("accountEmail", event.target.value)}
          className={fieldClass}
        />
      </label>
      <label className="text-xs font-semibold text-[#667068]">
        Account number (masked)
        <input
          value={draft.accountNumberMasked}
          onChange={(event) =>
            update("accountNumberMasked", event.target.value)
          }
          className={fieldClass}
          placeholder="•••• 1234"
        />
      </label>
    </div>
  );
}
