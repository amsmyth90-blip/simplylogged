import assert from "node:assert/strict";
import test from "node:test";

import {
  documentCategories,
  estateRooms,
  parseCaptureAnalysisResponse,
} from "@diarydock/capture";

const jobId = "11111111-1111-4111-8111-111111111111";

function validResponse() {
  return {
    captureJobId: jobId,
    extraction: {
      title: "Home policy",
      issuer: "Example Insurer",
      category: "Home & Property",
      suggestedRoom: "Safe Room",
      summary: "Annual policy schedule",
      reminderTitle: "Renew policy",
      reminderTimeLabel: "Next August",
      detectedDocumentType: "Insurance schedule",
      dueDate: "2027-09-01",
      actionItems: ["Review excess"],
      extractedText: "Policy schedule",
      confidence: 0.92,
      extractedFields: [{
        key: "policy_number",
        label: "Policy number",
        value: "••••1234",
        confidence: 0.95,
        source: "uploaded_document",
        userConfirmed: false,
      }],
    },
  };
}

test("mobile capture accepts a bounded provenance-preserving analysis", () => {
  const parsed = parseCaptureAnalysisResponse(validResponse());
  assert.equal(parsed.captureJobId, jobId);
  assert.equal(parsed.extraction.suggestedRoom, "Safe Room");
  assert.equal(parsed.extraction.extractedFields[0]?.source, "uploaded_document");
  assert.ok(documentCategories.includes(parsed.extraction.category));
  assert.ok(estateRooms.includes(parsed.extraction.suggestedRoom));
});

test("mobile capture rejects invalid provenance, confidence, categories and jobs", () => {
  const provenance = validResponse();
  provenance.extraction.extractedFields[0]!.userConfirmed = true;
  assert.throws(() => parseCaptureAnalysisResponse(provenance), /provenance/i);
  const confidence = validResponse();
  confidence.extraction.confidence = 1.1;
  assert.throws(() => parseCaptureAnalysisResponse(confidence), /confidence/i);
  const category = validResponse();
  category.extraction.category = "Unknown";
  assert.throws(() => parseCaptureAnalysisResponse(category), /category/i);
  const job = validResponse();
  job.captureJobId = "bad";
  assert.throws(() => parseCaptureAnalysisResponse(job), /job/i);
});
