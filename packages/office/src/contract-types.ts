export const OFFICE_CONTRACTS_SCHEMA_VERSION = 1;
export const OFFICE_CONTRACT_DETAIL_SCHEMA_VERSION = 1;

export const officeContractCategories = [
  "Broadband", "Mobile", "Streaming", "Software", "Membership", "Home service", "Other",
] as const;
export const officeContractStatuses = ["draft", "active", "cancelled", "expired"] as const;
export const officeContractFrequencies = ["monthly", "quarterly", "annual", "one-off"] as const;

export type OfficeContractCategory = (typeof officeContractCategories)[number];
export type OfficeContractStatus = (typeof officeContractStatuses)[number];
export type OfficeContractFrequency = (typeof officeContractFrequencies)[number];

export type OfficeContractPrice = {
  id: string;
  amount: number;
  effectiveDate: string;
  recordedAt: string;
};

export type OfficeContract = {
  contentComplete: boolean;
  id: string;
  documentId: string | null;
  serviceName: string;
  provider: string;
  category: OfficeContractCategory;
  status: OfficeContractStatus;
  reviewStatus: "needs-review" | "reviewed";
  accountEmail: string;
  accountNumberMasked: string;
  cost: number;
  frequency: OfficeContractFrequency;
  paymentMethod: string;
  startDate: string;
  minimumTermEnd: string;
  renewalDate: string;
  noticePeriodDays: number | null;
  autoRenew: boolean;
  promotionalPrice: number | null;
  promotionalEndDate: string;
  cancellationInstructions: string;
  notes: string;
  priceHistory: OfficeContractPrice[];
  lastReviewedAt: string;
  updatedAt: string;
};

export type OfficeContractsSnapshot = {
  schemaVersion: typeof OFFICE_CONTRACTS_SCHEMA_VERSION;
  revision: string | null;
  contracts: OfficeContract[];
};

export type SaveOfficeContract = Omit<OfficeContract,
  "contentComplete" | "documentId" | "id" | "lastReviewedAt" | "priceHistory"
  | "reviewStatus" | "updatedAt">;

export type OfficeContractDetailRequest = { contractId: string };
export type OfficeContractDetail = {
  schemaVersion: typeof OFFICE_CONTRACT_DETAIL_SCHEMA_VERSION;
  contract: OfficeContract;
};

export type OfficeContractMutation = {
  operation: "SAVE_CONTRACT";
  revision: string | null;
  contractId: string | null;
  contract: SaveOfficeContract;
};
