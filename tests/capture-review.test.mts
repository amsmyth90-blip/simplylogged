import assert from "node:assert/strict";
import test from "node:test";

import { canConfirmCapture, getCaptureReviewReasons } from "../lib/capture-review.ts";
import type { DocumentExtractionResult } from "../lib/document-extraction.ts";

function extraction(overrides: Partial<DocumentExtractionResult> = {}): DocumentExtractionResult {
  return {
    title: "Home insurance renewal",
    issuer: "Example Insurer",
    category: "Home & Property",
    suggestedRoom: "Office",
    summary: "Annual home insurance renewal notice.",
    reminderTitle: "Review home insurance",
    reminderTimeLabel: "In 30 days",
    detectedDocumentType: "insurance",
    dueDate: "2026-10-01",
    actionItems: [],
    extractedText: "Renewal date 1 October 2026",
    confidence: 0.93,
    ...overrides
  };
}

test("flags uncertain extracted details for the confirmation screen", () => {
  const reasons = getCaptureReviewReasons(extraction({
    confidence: 0.5,
    issuer: "Unknown",
    title: "Document",
    extractedText: ""
  }));

  assert.deepEqual(reasons, [
    "This document needs a quick confidence check",
    "Issuer needs checking",
    "Title may need a clearer name",
    "OCR text is missing"
  ]);
});

test("keeps clear extraction free of warning reasons", () => {
  assert.deepEqual(getCaptureReviewReasons(extraction()), []);
});

test("does not allow confirmation without a user-visible document name", () => {
  assert.equal(canConfirmCapture(extraction({ title: "   " })), false);
  assert.equal(canConfirmCapture(extraction()), true);
});
