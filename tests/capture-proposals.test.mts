import assert from "node:assert/strict";
import test from "node:test";

import { buildCaptureActionProposals, type ConfirmedCaptureField } from "../lib/capture/proposals.ts";

const field = (key: string, value: string, userConfirmed = true): ConfirmedCaptureField => ({
  key,
  label: key,
  value,
  confidence: 0.9,
  source: "uploaded_document",
  userConfirmed
});

test("proposes MOT update and reminder without executing either", () => {
  const proposals = buildCaptureActionProposals({
    captureJobId: "job-1",
    documentId: "doc-1",
    detectedDocumentType: "MOT certificate",
    fields: [field("registration", "AB12 CDE"), field("mot_expiry", "2027-02-01")]
  });
  assert.deepEqual(proposals.map((proposal) => proposal.actionType), ["update_record", "create_reminder"]);
  assert.equal(proposals.every((proposal) => proposal.dedupeKey.startsWith("job-1:")), true);
});

test("proposes an appliance and warranty reminder", () => {
  const proposals = buildCaptureActionProposals({
    captureJobId: "job-2",
    documentId: "doc-2",
    title: "Washing machine receipt and warranty",
    fields: [field("product", "Washing machine"), field("warranty_expiry", "2028-05-01")]
  });
  assert.deepEqual(proposals.map((proposal) => proposal.title), ["Create an appliance record", "Create a warranty expiry reminder"]);
});

test("uses only user-confirmed fields for pet proposals", () => {
  const proposals = buildCaptureActionProposals({
    captureJobId: "job-3",
    documentId: "doc-3",
    detectedDocumentType: "Pet vaccination card",
    fields: [field("pet_name", "Bella"), field("vaccine", "Booster"), field("next_due_date", "2027-03-02", false)]
  });
  assert.equal(proposals.length, 1);
  assert.equal(JSON.stringify(proposals).includes("2027-03-02"), false);
});

test("returns no automatic proposal for an unrelated document", () => {
  assert.deepEqual(buildCaptureActionProposals({ captureJobId: "job-4", documentId: "doc-4", title: "School letter", fields: [] }), []);
});
