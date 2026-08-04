export const contractCategories = [
  "Broadband",
  "Mobile",
  "Streaming",
  "Software",
  "Membership",
  "Home service",
  "Other",
] as const;

export type ContractCategory = (typeof contractCategories)[number];
export type ContractStatus = "draft" | "active" | "cancelled" | "expired";
export type ContractFrequency = "monthly" | "quarterly" | "annual" | "one-off";

export type ContractPriceEntry = {
  id: string;
  amount: number;
  effectiveDate: string;
  recordedAt: string;
};

export type ContractRecord = {
  id: string;
  documentId?: string;
  serviceName: string;
  provider: string;
  category: ContractCategory;
  status: ContractStatus;
  reviewStatus: "needs-review" | "reviewed";
  accountEmail: string;
  accountNumberMasked: string;
  monthlyCost: number;
  frequency: ContractFrequency;
  paymentMethod: string;
  startDate: string;
  minimumTermEnd: string;
  renewalDate: string;
  noticePeriodDays: number | null;
  autoRenew: boolean;
  promotionalPrice: number | null;
  promotionalEndDate: string;
  cancellationInstructions: string;
  cancellationProofDocumentId?: string;
  notes: string;
  storageBucket?: string;
  storagePath?: string;
  originalFileName?: string;
  mimeType?: string;
  priceHistory: ContractPriceEntry[];
  lastReviewedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ContractsRecord = { contracts: ContractRecord[] };

export function createInitialContractsRecord(): ContractsRecord {
  return { contracts: [] };
}

export function hydrateContractsRecord(
  value?: Partial<ContractsRecord>,
): ContractsRecord {
  return {
    contracts: Array.isArray(value?.contracts)
      ? value.contracts.map((contract) => ({
          ...contract,
          priceHistory: Array.isArray(contract.priceHistory)
            ? contract.priceHistory
            : [],
          reviewStatus:
            contract.reviewStatus === "reviewed" ? "reviewed" : "needs-review",
        }))
      : [],
  };
}

export function contractMonthlyCost(contract: ContractRecord) {
  if (contract.frequency === "annual") return contract.monthlyCost / 12;
  if (contract.frequency === "quarterly") return contract.monthlyCost / 3;
  return contract.frequency === "monthly" ? contract.monthlyCost : 0;
}

export function contractAnnualCost(contract: ContractRecord) {
  if (contract.frequency === "annual") return contract.monthlyCost;
  if (contract.frequency === "quarterly") return contract.monthlyCost * 4;
  if (contract.frequency === "monthly") return contract.monthlyCost * 12;
  return contract.monthlyCost;
}
