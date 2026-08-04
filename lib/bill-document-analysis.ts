import type { BillCategory, BillFrequency } from "@/lib/bill-records";

export type BillDocumentAnalysis = {
  title: string;
  provider: string;
  category: BillCategory;
  accountNumberMasked: string;
  amount: number;
  dueDate: string;
  frequency: BillFrequency;
  paymentMethod: string;
  directDebit: boolean;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  contractEndDate: string;
  noticePeriodDays: number | null;
  usage: string;
  summary: string;
  extractedText: string;
  reviewReasons: string[];
};

export const billDocumentAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    provider: { type: "string" },
    category: { type: "string", enum: ["Utilities", "Council tax", "Communications", "Subscriptions", "Home services", "Other"] },
    accountNumberMasked: { type: "string" },
    amount: { type: "number" },
    dueDate: { type: "string" },
    frequency: { type: "string", enum: ["monthly", "quarterly", "annual", "one-off"] },
    paymentMethod: { type: "string" },
    directDebit: { type: "boolean" },
    billingPeriodStart: { type: "string" },
    billingPeriodEnd: { type: "string" },
    contractEndDate: { type: "string" },
    noticePeriodDays: { anyOf: [{ type: "integer" }, { type: "null" }] },
    usage: { type: "string" },
    summary: { type: "string" },
    extractedText: { type: "string" },
    reviewReasons: { type: "array", items: { type: "string" } }
  },
  required: [
    "title", "provider", "category", "accountNumberMasked", "amount", "dueDate", "frequency",
    "paymentMethod", "directDebit", "billingPeriodStart", "billingPeriodEnd", "contractEndDate",
    "noticePeriodDays", "usage", "summary", "extractedText", "reviewReasons"
  ]
} as const;
