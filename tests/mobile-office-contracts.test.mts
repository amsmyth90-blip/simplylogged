import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  OFFICE_CONTRACT_DETAIL_SCHEMA_VERSION,
  parseOfficeContractDetail,
  parseOfficeContractDetailRequest,
  parseOfficeContractMutation,
  parseOfficeContractsSnapshot,
  parseSaveOfficeContract,
  type SaveOfficeContract,
} from "../packages/office/src/index.ts";
import { mutateOfficeContractsPayload } from "../lib/office/mobile-contracts-mutation.ts";
import { projectOfficeContractDetail,
  projectOfficeContractsSnapshot } from "../lib/office/mobile-contracts-payload.ts";

const contract: SaveOfficeContract = {
  serviceName: "Home broadband",
  provider: "Example Telecom",
  category: "Broadband",
  status: "active",
  accountEmail: "account@example.test",
  accountNumberMasked: "•••• 1234",
  cost: 42.5,
  frequency: "monthly",
  paymentMethod: "Direct Debit",
  startDate: "2026-01-01",
  minimumTermEnd: "2027-01-01",
  renewalDate: "2027-01-01",
  noticePeriodDays: 30,
  autoRenew: true,
  promotionalPrice: 29.5,
  promotionalEndDate: "2026-07-01",
  cancellationInstructions: "Contact the provider and retain confirmation.",
  notes: "Router included.",
};

test("Office contract contracts are exact, bounded and owner-free", () => {
  assert.deepEqual(parseSaveOfficeContract(contract), contract);
  assert.throws(() => parseSaveOfficeContract({ ...contract, userId: "other" }));
  assert.throws(() => parseSaveOfficeContract({ ...contract, documentId: "injected" }));
  assert.throws(() => parseSaveOfficeContract({ ...contract, notes: "x".repeat(4_001) }));
  assert.throws(() => parseSaveOfficeContract({ ...contract, contentComplete: true }));
  assert.throws(() => parseOfficeContractMutation({
    operation: "SAVE_CONTRACT", revision: null, contractId: null, contract, owner: "other",
  }));
});

test("Office contract projection removes storage controls and bounds history", () => {
  const snapshot = projectOfficeContractsSnapshot({
    contracts: { contracts: [{
      id: "contract-1", documentId: "document-1", storageBucket: "secret",
      storagePath: "user/private.pdf", cancellationProofDocumentId: "proof-1",
      reviewStatus: "reviewed", monthlyCost: 42.5, priceHistory: Array.from({ length: 250 }, (_, index) => ({
        id: `price-${index}`, amount: 40 + index, effectiveDate: "2026-01-01",
        recordedAt: "2026-01-01T00:00:00.000Z",
      })), lastReviewedAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
      ...contract,
    }] },
  }, "2026-01-01T00:00:00.000Z");
  assert.equal(snapshot.contracts.length, 1);
  assert.equal(snapshot.contracts[0]?.priceHistory.length, 200);
  assert.equal(JSON.stringify(snapshot).includes("storagePath"), false);
  assert.equal(JSON.stringify(snapshot).includes("cancellationProofDocumentId"), false);
  assert.deepEqual(parseOfficeContractsSnapshot(snapshot), snapshot);
  assert.equal(snapshot.contracts[0]?.contentComplete, true);
});

test("complete contract details are exact and independently projectable", () => {
  assert.deepEqual(parseOfficeContractDetailRequest({ contractId: "contract-1" }),
    { contractId: "contract-1" });
  assert.throws(() => parseOfficeContractDetailRequest({ contractId: "contract-1",
    ownerId: "other" }), /unsupported|invalid/);
  const detail = projectOfficeContractDetail({ contracts: { contracts: [{ id: "contract-1",
    documentId: null, monthlyCost: 42.5, reviewStatus: "reviewed", priceHistory: [],
    lastReviewedAt: "", updatedAt: "2026-01-01T00:00:00.000Z", ...contract }] } },
  "contract-1");
  assert.equal(detail?.contract.contentComplete, true);
  assert.equal(detail?.contract.notes, contract.notes);
  assert.deepEqual(parseOfficeContractDetail(detail), detail);
  assert.throws(() => parseOfficeContractDetail({ schemaVersion: OFFICE_CONTRACT_DETAIL_SCHEMA_VERSION,
    contract: { ...detail?.contract, contentComplete: false } }), /incomplete/);
});

test("contract projection fairly fits a large account into the encrypted cache", () => {
  const { cost: _cost, ...legacyContract } = contract;
  void _cost;
  const source = Array.from({ length: 300 }, (_, index) => ({
    id: `contract-${index}`,
    documentId: null,
    monthlyCost: 25,
    reviewStatus: "reviewed",
    priceHistory: [],
    lastReviewedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...legacyContract,
    notes: `${index}:${"界".repeat(3_990)}`,
    cancellationInstructions: `${index}:${"取".repeat(1_990)}`,
  }));
  const snapshot = projectOfficeContractsSnapshot({ contracts: { contracts: source } }, null);
  assert.equal(snapshot.contracts.length, 300);
  assert.ok(snapshot.contracts.every((item) => item.notes.length > 0));
  assert.ok(snapshot.contracts.some((item) => !item.contentComplete));
  assert.ok(Buffer.byteLength(JSON.stringify(snapshot), "utf8") <= 480 * 1024);
});

test("contract mutation preserves unrelated state and immutable document identity", () => {
  const { cost: _cost, ...legacyContract } = contract;
  void _cost;
  const current = {
    emergency: { contacts: [{ id: "keep" }] },
    contracts: { contracts: [{
      id: "contract-1", documentId: "document-1", storagePath: "user/private.pdf",
      cancellationProofDocumentId: "proof-1", monthlyCost: 35, priceHistory: [],
      reviewStatus: "needs-review", createdAt: "2025-01-01T00:00:00.000Z",
      ...legacyContract,
    }] },
  };
  const result = mutateOfficeContractsPayload(current, {
    operation: "SAVE_CONTRACT", revision: null, contractId: "contract-1",
    contract: { ...contract, cost: 45 },
  }, () => "unused", "2026-02-01T00:00:00.000Z");
  assert.equal(result.status, "OK");
  if (result.status !== "OK") return;
  assert.deepEqual(result.payload.emergency, current.emergency);
  const saved = (result.payload.contracts as { contracts: Record<string, unknown>[] }).contracts[0]!;
  assert.equal(saved.documentId, "document-1");
  assert.equal(saved.storagePath, "user/private.pdf");
  assert.equal(saved.cancellationProofDocumentId, "proof-1");
  assert.equal(saved.monthlyCost, 45);
  assert.equal(Array.isArray(saved.priceHistory) && saved.priceHistory.length, 1);
  assert.deepEqual(result.document, {
    id: "document-1", title: "Home broadband", provider: "Example Telecom", dueDate: "2027-01-01",
  });
});

test("mobile contracts API is owner-derived, revisioned, bounded and atomic", async () => {
  const route = await readFile("app/api/mobile/office/contracts/route.ts", "utf8");
  const server = await readFile("lib/office/mobile-contracts-server.ts", "utf8");
  const migration = await readFile("supabase/migrations/20260904202000_mobile_office_service_boundary.sql", "utf8");
  assert.match(route, /authenticateHybridRequest/);
  assert.match(route, /readBoundedJson\(request, 24 \* 1024\)/);
  assert.match(route, /checkServerRateLimit/);
  assert.match(route, /parseOfficeContractDetailRequest/);
  assert.match(route, /loadOfficeContractDetail/);
  assert.match(route, /getSupabaseAdminClient/);
  assert.match(server, /\.eq\("id", userId\)/);
  assert.match(server, /projectOfficeContractDetail/);
  assert.match(server, /mutation\.revision !== snapshot\.revision/);
  assert.match(server, /apply_mobile_office_state/);
  assert.match(server, /input_document_kind: "contract"/);
  assert.match(migration, /security definer/i);
  assert.match(migration, /auth\.role\(\) is distinct from 'service_role'/);
  assert.match(migration, /where id = document_id and user_id = input_user_id/);
  assert.match(migration, /apply_mobile_contract_state[\s\S]*authenticated, service_role/);
});

test("native contracts use encrypted cache and dedicated Office contracts", async () => {
  const hook = await readFile("apps/mobile/src/office/use-office-contracts.ts", "utf8");
  const client = await readFile("apps/mobile/src/office/contracts-client.ts", "utf8");
  const screen = await readFile("apps/mobile/src/office/OfficeScreen.tsx", "utf8");
  const content = await readFile("apps/mobile/src/office/OfficeContent.tsx", "utf8");
  const editors = await readFile("apps/mobile/src/office/OfficeEditors.tsx", "utf8");
  const editor = await readFile("apps/mobile/src/office/ContractEditor.tsx", "utf8");
  const workspace = await readFile("apps/mobile/src/office/use-office-workspace.ts", "utf8");
  assert.match(hook, /tryPutReadModel/);
  assert.match(hook, /CACHE_KEY = "office-contracts"/);
  assert.match(hook, /Connect to change Office contracts/);
  assert.match(client, /\/api\/mobile\/office\/contracts/);
  assert.match(client, /requestDeadline\(20_000\)/);
  assert.match(client, /loadMobileOfficeContractDetail/);
  assert.match(hook, /readModelCacheKey\("office-contract"/);
  assert.match(hook, /local\?\.contract\.updatedAt === summary\.updatedAt/);
  assert.match(workspace, /contracts\.loadContract\(contract\.id\)/);
  assert.match(screen, /<OfficeContent/);
  assert.match(screen, /<OfficeEditors/);
  assert.match(content, /<ContractsPanel/);
  assert.match(editors, /<ContractEditor/);
  assert.match(editor, /Add renewal reminder/);
  assert.match(editor, /contentComplete, id, documentId/);
});
