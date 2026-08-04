import type { OfficeInsuranceType, PremiumFrequency } from "@/lib/insurance-records";

export type InsuranceDocumentAnalysis = {
  title: string;
  type: OfficeInsuranceType;
  provider: string;
  policyNumberMasked: string;
  startDate: string;
  renewalDate: string;
  premium: number;
  premiumFrequency: PremiumFrequency;
  autoRenew: boolean;
  coverSummary: string;
  includedCover: string[];
  excludedCover: string[];
  excess: number;
  providerPhone: string;
  providerEmail: string;
  reviewReasons: string[];
  extractedText: string;
};

export const insuranceDocumentAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    type: { type: "string", enum: ["Home", "Life", "Income protection", "Critical illness", "Other personal"] },
    provider: { type: "string" }, policyNumberMasked: { type: "string" }, startDate: { type: "string" }, renewalDate: { type: "string" }, premium: { type: "number" },
    premiumFrequency: { type: "string", enum: ["monthly", "annual", "one-off"] }, autoRenew: { type: "boolean" }, coverSummary: { type: "string" },
    includedCover: { type: "array", items: { type: "string" } }, excludedCover: { type: "array", items: { type: "string" } }, excess: { type: "number" },
    providerPhone: { type: "string" }, providerEmail: { type: "string" }, reviewReasons: { type: "array", items: { type: "string" } }, extractedText: { type: "string" }
  },
  required: ["title","type","provider","policyNumberMasked","startDate","renewalDate","premium","premiumFrequency","autoRenew","coverSummary","includedCover","excludedCover","excess","providerPhone","providerEmail","reviewReasons","extractedText"]
} as const;
