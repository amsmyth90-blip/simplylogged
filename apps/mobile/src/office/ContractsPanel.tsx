import type { OfficeContract } from "@diarydock/office";

import { formatOfficeDate, formatOfficeMoney } from "./office-bills-format";

function monthlyCost(contract: OfficeContract) {
  if (contract.frequency === "annual") return contract.cost / 12;
  if (contract.frequency === "quarterly") return contract.cost / 3;
  return contract.frequency === "monthly" ? contract.cost : 0;
}

export function ContractsPanel({
  contracts,
  loadingContractId,
  onEdit,
}: {
  contracts: OfficeContract[];
  loadingContractId: string;
  onEdit: (contract: OfficeContract) => Promise<void>;
}) {
  if (!contracts.length) return <p className="office-empty">No contracts have been added yet.</p>;
  return (
    <div className="office-policy-list">
      {contracts.map((contract) => (
        <button className="office-policy-row" key={contract.id} type="button"
          disabled={Boolean(loadingContractId)} onClick={() => void onEdit(contract)}>
          <span className={`office-policy-icon office-policy-${contract.status}`}>C</span>
          <span>
            <strong>{contract.serviceName || contract.provider}</strong>
            <small>{loadingContractId === contract.id ? "Opening full details…"
              : `${contract.provider || contract.category} · ${contract.renewalDate
                ? `Renews ${formatOfficeDate(contract.renewalDate)}` : "No renewal date"}`}</small>
          </span>
          <b>{formatOfficeMoney(monthlyCost(contract))}<small>/month</small></b>
        </button>
      ))}
    </div>
  );
}
