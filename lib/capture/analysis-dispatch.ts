import {
  documentExtractionSchema,
  type DocumentExtractionResult,
} from "@/lib/document-extraction";
import { billDocumentAnalysisSchema, type BillDocumentAnalysis } from "@/lib/bill-document-analysis";
import { insuranceDocumentAnalysisSchema, type InsuranceDocumentAnalysis } from "@/lib/insurance-document-analysis";
import { receiptDocumentAnalysisSchema, type ReceiptDocumentAnalysis } from "@/lib/receipt-document-analysis";
import { willDocumentAnalysisSchema, type WillDocumentAnalysis } from "@/lib/will-document-analysis";

import { captureAnalysisPrompt } from "./analysis-prompts.ts";
import type { CaptureAnalysisProvider } from "./provider.ts";
import type { AnalysisMode, SafeCaptureFile } from "./analysis-types.ts";

function model() {
  return process.env.OPENAI_VISION_MODEL || "gpt-5";
}

function pages(files: SafeCaptureFile[]) {
  return files.map((file) => ({
    imageUrl: `data:${file.mimeType};base64,${Buffer.from(file.bytes).toString("base64")}`,
    detail: "high" as const,
  }));
}

function proposedFields(result: Record<string, unknown>) {
  return {
    title: typeof result.title === "string" ? result.title : undefined,
    category: typeof result.category === "string" ? result.category : undefined,
    suggestedRoom: typeof result.suggestedRoom === "string" ? result.suggestedRoom : undefined,
    detectedDocumentType: typeof result.detectedDocumentType === "string"
      ? result.detectedDocumentType : undefined,
    dueDate: typeof result.dueDate === "string" ? result.dueDate : undefined,
    confidence: typeof result.confidence === "number" ? result.confidence : undefined,
    source: "uploaded_document",
    userConfirmed: false,
    extractedFields: Array.isArray(result.extractedFields) ? result.extractedFields : [],
  };
}

export async function dispatchCaptureAnalysis(
  provider: CaptureAnalysisProvider,
  mode: AnalysisMode,
  files: SafeCaptureFile[],
) {
  const common = {
    model: model(),
    prompt: captureAnalysisPrompt(mode, files.length),
    pages: pages(files),
  };
  let response: Record<string, unknown>;
  let result: Record<string, unknown>;

  if (mode === "will") {
    const value = await provider.analyse<WillDocumentAnalysis>({
      ...common, schemaName: "diarydock_will_document_analysis", schema: willDocumentAnalysisSchema,
    });
    result = value as unknown as Record<string, unknown>;
    response = { willAnalysis: value };
  } else if (mode === "bill") {
    const value = await provider.analyse<BillDocumentAnalysis>({
      ...common, schemaName: "diarydock_bill_document_analysis", schema: billDocumentAnalysisSchema,
    });
    result = value as unknown as Record<string, unknown>;
    response = { billAnalysis: value };
  } else if (mode === "insurance") {
    const value = await provider.analyse<InsuranceDocumentAnalysis>({
      ...common, schemaName: "diarydock_insurance_document_analysis", schema: insuranceDocumentAnalysisSchema,
    });
    result = value as unknown as Record<string, unknown>;
    response = { insuranceAnalysis: value };
  } else if (mode === "receipt") {
    const value = await provider.analyse<ReceiptDocumentAnalysis>({
      ...common, schemaName: "diarydock_vehicle_receipt_analysis", schema: receiptDocumentAnalysisSchema,
    });
    result = value as unknown as Record<string, unknown>;
    response = { receiptAnalysis: value };
  } else {
    const value = await provider.analyse<DocumentExtractionResult>({
      ...common, schemaName: "diarydock_document_extraction", schema: documentExtractionSchema,
    });
    result = value as unknown as Record<string, unknown>;
    response = { extraction: value };
  }
  return { proposedFields: proposedFields(result), response };
}
