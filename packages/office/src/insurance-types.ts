export const OFFICE_INSURANCE_SCHEMA_VERSION = 1;
export const OFFICE_INSURANCE_DETAIL_SCHEMA_VERSION = 1;

export const officeInsuranceTypes = [
  "Home", "Life", "Income protection", "Critical illness", "Other personal",
] as const;
export const officePolicyStatuses = ["draft", "active", "expired", "cancelled"] as const;
export const officePremiumFrequencies = ["monthly", "annual", "one-off"] as const;
export const officeClaimStatuses = [
  "draft", "submitted", "assessing", "action-required", "settled", "closed",
] as const;

export type OfficeInsuranceType = (typeof officeInsuranceTypes)[number];
export type OfficePolicyStatus = (typeof officePolicyStatuses)[number];
export type OfficePremiumFrequency = (typeof officePremiumFrequencies)[number];
export type OfficeClaimStatus = (typeof officeClaimStatuses)[number];

export type OfficePolicyCoverItem = {
  id: string;
  label: string;
  value: string;
  included: boolean;
};

export type OfficePolicyHistory = {
  id: string;
  premium: number;
  excess: number;
  renewalDate: string;
  recordedAt: string;
};

export type OfficeInsurancePolicy = {
  contentComplete: boolean;
  id: string;
  documentId: string | null;
  title: string;
  type: OfficeInsuranceType;
  provider: string;
  policyNumberMasked: string;
  status: OfficePolicyStatus;
  reviewStatus: "needs-review" | "reviewed";
  startDate: string;
  renewalDate: string;
  premium: number;
  premiumFrequency: OfficePremiumFrequency;
  autoRenew: boolean;
  coverSummary: string;
  coverItems: OfficePolicyCoverItem[];
  excess: number;
  providerPhone: string;
  providerEmail: string;
  linkedPeople: string[];
  linkedAsset: string;
  beneficiaries: string;
  notes: string;
  history: OfficePolicyHistory[];
  createdAt: string;
  updatedAt: string;
};

export type SaveOfficeInsurancePolicy = Omit<
  OfficeInsurancePolicy,
  "contentComplete" | "createdAt" | "documentId" | "history" | "id"
  | "reviewStatus" | "updatedAt"
>;

export type OfficeInsuranceClaim = {
  contentComplete: boolean;
  id: string;
  policyId: string;
  title: string;
  claimNumberMasked: string;
  incidentDate: string;
  status: OfficeClaimStatus;
  description: string;
  evidenceDocumentIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type SaveOfficeInsuranceClaim = Omit<
  OfficeInsuranceClaim,
  "contentComplete" | "createdAt" | "evidenceDocumentIds" | "id" | "updatedAt"
>;

export type OfficeInsuranceSnapshot = {
  schemaVersion: typeof OFFICE_INSURANCE_SCHEMA_VERSION;
  revision: string | null;
  policies: OfficeInsurancePolicy[];
  claims: OfficeInsuranceClaim[];
};

export type OfficeInsuranceDetailRequest = {
  resourceType: "POLICY" | "CLAIM";
  resourceId: string;
};
export type OfficeInsuranceDetail =
  | { schemaVersion: typeof OFFICE_INSURANCE_DETAIL_SCHEMA_VERSION;
      resourceType: "POLICY"; policy: OfficeInsurancePolicy }
  | { schemaVersion: typeof OFFICE_INSURANCE_DETAIL_SCHEMA_VERSION;
      resourceType: "CLAIM"; claim: OfficeInsuranceClaim };

export type OfficeInsuranceMutation =
  | { operation: "SAVE_POLICY"; revision: string | null; policyId: string | null; policy: SaveOfficeInsurancePolicy }
  | { operation: "SAVE_CLAIM"; revision: string | null; claimId: string | null; claim: SaveOfficeInsuranceClaim };
