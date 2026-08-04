import type { VehicleExpense } from "@/lib/vehicle-records";

export type ReceiptDocumentAnalysis = {
  title: string;
  merchant: string;
  date: string;
  amount: number;
  category: VehicleExpense["category"];
  mileage: number | null;
  paymentMethod: string;
  receiptNumber: string;
  summary: string;
  extractedText: string;
  reviewReasons: string[];
};

export const receiptDocumentAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    merchant: { type: "string" },
    date: { type: "string" },
    amount: { type: "number" },
    category: { type: "string", enum: ["Fuel", "Service", "Repair", "Tax", "Insurance", "Breakdown", "Tyres", "Parking", "Other"] },
    mileage: { anyOf: [{ type: "integer" }, { type: "null" }] },
    paymentMethod: { type: "string" },
    receiptNumber: { type: "string" },
    summary: { type: "string" },
    extractedText: { type: "string" },
    reviewReasons: { type: "array", items: { type: "string" } },
  },
  required: ["title", "merchant", "date", "amount", "category", "mileage", "paymentMethod", "receiptNumber", "summary", "extractedText", "reviewReasons"],
} as const;
