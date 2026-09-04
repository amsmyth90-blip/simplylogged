import type { DocumentExtractionResult } from "@/lib/document-extraction";

export function getCaptureReviewReasons(extraction: DocumentExtractionResult) {
  const reasons: string[] = [];

  if (extraction.confidence < 0.85) {
    reasons.push("This document needs a quick confidence check");
  }

  if (!extraction.issuer.trim() || extraction.issuer.toLowerCase().includes("unknown")) {
    reasons.push("Issuer needs checking");
  }

  if (!extraction.title.trim() || extraction.title.toLowerCase().includes("document")) {
    reasons.push("Title may need a clearer name");
  }

  if (!extraction.extractedText.trim()) {
    reasons.push("OCR text is missing");
  }

  return reasons;
}

export function canConfirmCapture(extraction: DocumentExtractionResult) {
  return Boolean(extraction.title.trim());
}
