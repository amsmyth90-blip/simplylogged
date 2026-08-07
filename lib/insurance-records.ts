export const officeInsuranceTypes = [
  "Home",
  "Life",
  "Income protection",
  "Critical illness",
  "Other personal",
] as const;
export type OfficeInsuranceType = (typeof officeInsuranceTypes)[number];
export type PolicyStatus = "draft" | "active" | "expired" | "cancelled";
export type PremiumFrequency = "monthly" | "annual" | "one-off";
export type ClaimStatus =
  | "draft"
  | "submitted"
  | "assessing"
  | "action-required"
  | "settled"
  | "closed";

export type PolicyCoverItem = {
  id: string;
  label: string;
  value: string;
  included: boolean;
};
export type PolicyHistoryEntry = {
  id: string;
  premium: number;
  excess: number;
  renewalDate: string;
  recordedAt: string;
};

export type InsurancePolicy = {
  id: string;
  documentId?: string;
  title: string;
  type: OfficeInsuranceType;
  provider: string;
  policyNumberMasked: string;
  status: PolicyStatus;
  reviewStatus: "needs-review" | "reviewed";
  startDate: string;
  renewalDate: string;
  premium: number;
  premiumFrequency: PremiumFrequency;
  autoRenew: boolean;
  coverSummary: string;
  coverItems: PolicyCoverItem[];
  excess: number;
  providerPhone: string;
  providerEmail: string;
  linkedPeople: string[];
  linkedAsset: string;
  beneficiaries: string;
  notes: string;
  storageBucket?: string;
  storagePath?: string;
  originalFileName?: string;
  mimeType?: string;
  history: PolicyHistoryEntry[];
  createdAt: string;
  updatedAt: string;
};

export type InsuranceClaim = {
  id: string;
  policyId: string;
  title: string;
  claimNumberMasked: string;
  incidentDate: string;
  status: ClaimStatus;
  description: string;
  evidenceDocumentIds: string[];
  createdAt: string;
  updatedAt: string;
};

export const homeInventoryRooms = [
  "Living room",
  "Kitchen",
  "Bedroom",
  "Home office",
  "Bathroom",
  "Garden & outside",
  "Other",
] as const;
export type HomeInventoryRoom = (typeof homeInventoryRooms)[number];

export type HomeInventoryItem = {
  id: string;
  policyId: string;
  room: HomeInventoryRoom;
  category: string;
  name: string;
  quantity: number;
  estimatedValue: number;
  purchaseDate: string;
  serialNumberMasked: string;
  highValue: boolean;
  receiptDocumentId?: string;
  photoDocumentIds: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type HomeCoverCheck = {
  policyId: string;
  estimatedRebuildCost: number;
  recentHomeChanges: string;
  lastReviewedAt: string;
};

export type LifeBeneficiary = {
  id: string;
  policyId: string;
  name: string;
  relationship: string;
  percentage: number;
  primary: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type LifePolicyDetails = {
  policyId: string;
  coveredPerson: string;
  coverAmount: number;
  coverType: "lump-sum" | "family-income" | "decreasing" | "other";
  termEndDate: string;
  criticalIllnessIncluded: boolean;
  criticalIllnessAmount: number;
  exclusions: string;
  claimsPhone: string;
  adviserName: string;
  adviserPhone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  inTrust: boolean;
  trustName: string;
  trusteeNames: string;
  familyGuidance: string;
  lastReviewedAt: string;
};

export type InsuranceRecord = {
  policies: InsurancePolicy[];
  claims: InsuranceClaim[];
  homeInventory: HomeInventoryItem[];
  homeCoverChecks: HomeCoverCheck[];
  lifeBeneficiaries: LifeBeneficiary[];
  lifePolicyDetails: LifePolicyDetails[];
};

export function createInitialInsuranceRecord(): InsuranceRecord {
  return {
    policies: [],
    claims: [],
    homeInventory: [],
    homeCoverChecks: [],
    lifeBeneficiaries: [],
    lifePolicyDetails: [],
  };
}
export function hydrateInsuranceRecord(
  value?: Partial<InsuranceRecord>,
): InsuranceRecord {
  return {
    policies: Array.isArray(value?.policies)
      ? value.policies.map((policy) => ({
          ...policy,
          coverItems: Array.isArray(policy.coverItems) ? policy.coverItems : [],
          linkedPeople: Array.isArray(policy.linkedPeople)
            ? policy.linkedPeople
            : [],
          history: Array.isArray(policy.history) ? policy.history : [],
          reviewStatus:
            policy.reviewStatus === "reviewed" ? "reviewed" : "needs-review",
        }))
      : [],
    claims: Array.isArray(value?.claims)
      ? value.claims.map((claim) => ({
          ...claim,
          evidenceDocumentIds: Array.isArray(claim.evidenceDocumentIds)
            ? claim.evidenceDocumentIds
            : [],
        }))
      : [],
    homeInventory: Array.isArray(value?.homeInventory)
      ? value.homeInventory.map((item) => ({
          ...item,
          photoDocumentIds: Array.isArray(item.photoDocumentIds)
            ? item.photoDocumentIds
            : [],
        }))
      : [],
    homeCoverChecks: Array.isArray(value?.homeCoverChecks)
      ? value.homeCoverChecks
      : [],
    lifeBeneficiaries: Array.isArray(value?.lifeBeneficiaries)
      ? value.lifeBeneficiaries
      : [],
    lifePolicyDetails: Array.isArray(value?.lifePolicyDetails)
      ? value.lifePolicyDetails
      : [],
  };
}

export function policyAnnualPremium(policy: InsurancePolicy) {
  if (policy.premiumFrequency === "monthly") return policy.premium * 12;
  return policy.premium;
}

export function policyMonthlyPremium(policy: InsurancePolicy) {
  if (policy.premiumFrequency === "annual") return policy.premium / 12;
  return policy.premiumFrequency === "monthly" ? policy.premium : 0;
}
