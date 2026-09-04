import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  OFFICE_INSURANCE_DETAIL_SCHEMA_VERSION,
  OFFICE_INSURANCE_SCHEMA_VERSION,
  parseOfficeInsuranceDetail,
  parseOfficeInsuranceMutation,
  parseOfficeInsuranceSnapshot,
} from "@diarydock/office";

import { mutateOfficeInsurancePayload } from "../lib/office/mobile-insurance-mutation.ts";
import { projectOfficeInsuranceDetail,
  projectOfficeInsuranceSnapshot } from "../lib/office/mobile-insurance-payload.ts";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const revision = "2026-09-02T12:00:00.000Z";

function policyFields() {
  return {
    title: "Home insurance",
    type: "Home",
    provider: "Example Insurance",
    policyNumberMasked: "•••• 1234",
    status: "active",
    startDate: "2026-01-01",
    renewalDate: "2027-01-01",
    premium: 480,
    premiumFrequency: "annual",
    autoRenew: true,
    coverSummary: "Buildings and contents cover.",
    coverItems: [{ id: "cover-1", label: "Buildings", value: "Included", included: true }],
    excess: 250,
    providerPhone: "0800 000 0000",
    providerEmail: "help@example.test",
    linkedPeople: ["Alex Morgan"],
    linkedAsset: "Family home",
    beneficiaries: "",
    notes: "Check rebuild value",
  } as const;
}

function storedPolicy() {
  return {
    id: "policy-1",
    documentId: "document-1",
    ...policyFields(),
    reviewStatus: "reviewed",
    history: [{ id: "history-1", premium: 460, excess: 250, renewalDate: "2026-01-01", recordedAt: revision }],
    createdAt: revision,
    updatedAt: revision,
    storageBucket: "private-bucket",
    storagePath: "owner/policy/file.pdf",
  };
}

function storedClaim() {
  return {
    id: "claim-1",
    policyId: "policy-1",
    title: "Storm damage",
    claimNumberMasked: "•••• 9988",
    incidentDate: "2026-08-20",
    status: "assessing",
    description: "Roof damage",
    evidenceDocumentIds: ["evidence-1"],
    createdAt: revision,
    updatedAt: revision,
  };
}

function contractPolicy() {
  const { storageBucket, storagePath, ...policy } = storedPolicy();
  void storageBucket; void storagePath;
  return { contentComplete: true, ...policy };
}

test("Office insurance contracts are exact, bounded and owner-free", () => {
  const snapshot = parseOfficeInsuranceSnapshot({
    schemaVersion: OFFICE_INSURANCE_SCHEMA_VERSION,
    revision,
    policies: [contractPolicy()],
    claims: [{ contentComplete: true, ...storedClaim() }],
  });
  assert.equal(snapshot.policies[0]?.title, "Home insurance");
  assert.equal(snapshot.claims[0]?.status, "assessing");
  assert.throws(() => parseOfficeInsuranceSnapshot({
    schemaVersion: OFFICE_INSURANCE_SCHEMA_VERSION,
    revision,
    policies: [{ ...contractPolicy(), ownerId: "other-user" }],
    claims: [],
  }), /unsupported/i);
  assert.throws(() => parseOfficeInsuranceMutation({
    operation: "SAVE_POLICY",
    revision,
    policyId: "policy-1",
    policy: { ...policyFields(), userId: "other-user" },
  }), /unsupported/i);
});

test("Office insurance projection strips storage controls and stays cache bounded", () => {
  const snapshot = projectOfficeInsuranceSnapshot({
    insurance: { policies: [storedPolicy()], claims: [storedClaim()] },
  }, revision);
  assert.equal(snapshot.policies[0]?.documentId, "document-1");
  assert.equal(JSON.stringify(snapshot).includes("private-bucket"), false);
  assert.ok(Buffer.byteLength(JSON.stringify(snapshot), "utf8") < 480 * 1024);
});

test("insurance projection enforces the UTF-8 wire-byte ceiling", () => {
  const policies = Array.from({ length: 200 }, (_, index) => ({
    ...storedPolicy(),
    id: `policy-${index}`,
    documentId: null,
    notes: `${index}:${"界".repeat(3_990)}`,
    history: [],
  }));
  const snapshot = projectOfficeInsuranceSnapshot({ insurance: { policies, claims: [] } }, revision);
  assert.equal(snapshot.policies.length, policies.length);
  assert.ok(snapshot.policies.every((entry) => !entry.contentComplete));
  assert.ok(Buffer.byteLength(JSON.stringify(snapshot), "utf8") <= 480 * 1024);
});

test("complete policy and claim details are independently owner-projectable", () => {
  const payload = { insurance: { policies: [storedPolicy()], claims: [storedClaim()] } };
  const policy = projectOfficeInsuranceDetail(payload, "POLICY", "policy-1");
  const claim = projectOfficeInsuranceDetail(payload, "CLAIM", "claim-1");
  assert.equal(policy?.schemaVersion, OFFICE_INSURANCE_DETAIL_SCHEMA_VERSION);
  assert.equal(policy?.resourceType, "POLICY");
  assert.equal(policy?.resourceType === "POLICY" && policy.policy.contentComplete, true);
  assert.equal(claim?.resourceType === "CLAIM" && claim.claim.description, "Roof damage");
  assert.deepEqual(parseOfficeInsuranceDetail(policy), policy);
  assert.deepEqual(parseOfficeInsuranceDetail(claim), claim);
  assert.equal(projectOfficeInsuranceDetail(payload, "POLICY", "missing"), null);
  assert.throws(() => parseOfficeInsuranceMutation({
    operation: "SAVE_POLICY", revision, policyId: "policy-1",
    policy: { ...policyFields(), contentComplete: true },
  }), /unsupported/i);
});

test("insurance mutations preserve unrelated state, linked files and claim evidence", () => {
  const source = {
    unrelatedPrivateState: { retained: true },
    insurance: { policies: [storedPolicy()], claims: [storedClaim()], homeInventory: [{ id: "item-1" }] },
  };
  const policyMutation = parseOfficeInsuranceMutation({
    operation: "SAVE_POLICY",
    revision,
    policyId: "policy-1",
    policy: { ...policyFields(), premium: 510 },
  });
  const policyResult = mutateOfficeInsurancePayload(source, policyMutation, () => "fixed", revision);
  assert.equal(policyResult.status, "OK");
  if (policyResult.status !== "OK") return;
  assert.deepEqual(policyResult.payload.unrelatedPrivateState, source.unrelatedPrivateState);
  const insurance = policyResult.payload.insurance as Record<string, unknown>;
  assert.deepEqual(insurance.homeInventory, [{ id: "item-1" }]);
  const updated = (insurance.policies as Array<Record<string, unknown>>)[0]!;
  assert.equal(updated.storagePath, storedPolicy().storagePath);
  assert.equal((updated.history as unknown[]).length, 2);
  assert.deepEqual(policyResult.document, {
    id: "document-1",
    title: "Home insurance",
    provider: "Example Insurance",
    dueDate: "2027-01-01",
  });

  const claimMutation = parseOfficeInsuranceMutation({
    operation: "SAVE_CLAIM",
    revision,
    claimId: "claim-1",
    claim: {
      policyId: "policy-1",
      title: "Storm damage",
      claimNumberMasked: "•••• 9988",
      incidentDate: "2026-08-20",
      status: "settled",
      description: "Roof damage",
    },
  });
  const claimResult = mutateOfficeInsurancePayload(source, claimMutation, () => "fixed", revision);
  assert.equal(claimResult.status, "OK");
  if (claimResult.status !== "OK") return;
  const claim = ((claimResult.payload.insurance as Record<string, unknown>).claims as Array<Record<string, unknown>>)[0]!;
  assert.deepEqual(claim.evidenceDocumentIds, ["evidence-1"]);
});

test("claims cannot reference a policy outside the account state", () => {
  const mutation = parseOfficeInsuranceMutation({
    operation: "SAVE_CLAIM",
    revision,
    claimId: null,
    claim: {
      policyId: "other-policy",
      title: "Invalid claim",
      claimNumberMasked: "",
      incidentDate: "",
      status: "draft",
      description: "",
    },
  });
  const result = mutateOfficeInsurancePayload({
    insurance: { policies: [storedPolicy()], claims: [] },
  }, mutation);
  assert.equal(result.status, "INVALID_REFERENCE");
});

test("mobile insurance API is owner-derived, revisioned, bounded and atomic", async () => {
  const [route, server, migration] = await Promise.all([
    read("app/api/mobile/office/insurance/route.ts"),
    read("lib/office/mobile-insurance-server.ts"),
    read("supabase/migrations/20260904202000_mobile_office_service_boundary.sql"),
  ]);
  assert.match(route, /authenticateHybridRequest/);
  assert.match(route, /parseOfficeInsuranceDetailRequest/);
  assert.match(route, /readBoundedJson\(request, 32 \* 1024\)/);
  assert.match(route, /checkServerRateLimit/);
  assert.match(route, /RequestObservation/);
  assert.match(route, /getSupabaseAdminClient/);
  assert.doesNotMatch(route, /body\.ownerId|body\.userId/);
  assert.match(server, /mutation\.revision !== snapshot\.revision/);
  assert.match(server, /projectOfficeInsuranceDetail/);
  assert.match(server, /apply_mobile_office_state/);
  assert.match(server, /input_document_kind: "insurance"/);
  assert.match(migration, /auth\.role\(\) is distinct from 'service_role'/);
  assert.match(migration, /where id = document_id and user_id = input_user_id/);
  assert.match(migration, /apply_mobile_insurance_state[\s\S]*authenticated, service_role/);
});

test("native insurance uses encrypted cache and dedicated Office contracts", async () => {
  const [screen, workspace, content, editors, hook, client] = await Promise.all([
    read("apps/mobile/src/office/OfficeScreen.tsx"),
    read("apps/mobile/src/office/use-office-workspace.ts"),
    read("apps/mobile/src/office/OfficeContent.tsx"),
    read("apps/mobile/src/office/OfficeEditors.tsx"),
    read("apps/mobile/src/office/use-office-insurance.ts"),
    read("apps/mobile/src/office/insurance-client.ts"),
  ]);
  assert.match(screen, /<OfficeContent/);
  assert.match(workspace, /SAVE_POLICY/);
  assert.match(workspace, /SAVE_CLAIM/);
  assert.match(workspace, /loadPolicy/);
  assert.match(workspace, /loadClaim/);
  assert.match(content, /<InsurancePanel/);
  assert.match(editors, /<InsurancePolicyEditor/);
  assert.match(editors, /<InsuranceClaimEditor/);
  assert.match(hook, /tryPutReadModel\(/);
  assert.match(hook, /readModelCacheKey/);
  assert.match(hook, /OfficeInsuranceConflictError/);
  assert.doesNotMatch(hook, /localStorage|sessionStorage|indexedDB/i);
  assert.match(client, /Authorization: authorization/);
  assert.match(client, /requestDeadline/);
  assert.match(client, /parseOfficeInsuranceDetail/);
});
