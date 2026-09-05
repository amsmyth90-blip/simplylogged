import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  OFFICE_BILL_DETAIL_SCHEMA_VERSION,
  OFFICE_BILLS_SCHEMA_VERSION,
  parseOfficeBillDetail,
  parseOfficeBillMutation,
  parseOfficeBillsSnapshot,
} from "@diarydock/office";

import { mutateOfficeBillsPayload } from "../lib/office/mobile-bills-mutation.ts";
import { projectOfficeBillDetail,
  projectOfficeBillsSnapshot } from "../lib/office/mobile-bills-payload.ts";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const revision = "2026-09-02T11:00:00.000Z";

function billFields() {
  return {
    title: "Electricity",
    provider: "Example Energy",
    category: "Utilities",
    accountNumberMasked: "•••• 1234",
    amount: 84.2,
    dueDate: "2026-10-01",
    frequency: "monthly",
    paymentMethod: "Direct Debit",
    directDebit: true,
    status: "active",
    billingPeriodStart: "2026-09-01",
    billingPeriodEnd: "2026-09-30",
    contractEndDate: "2027-03-31",
    noticePeriodDays: 30,
    usage: "1842 kWh",
    notes: "Check meter reading",
  } as const;
}

function storedBill() {
  return {
    id: "bill-1",
    documentId: "document-1",
    ...billFields(),
    reviewStatus: "reviewed",
    history: [{ id: "history-1", amount: 80, dueDate: "2026-09-01", recordedAt: revision }],
    createdAt: revision,
    updatedAt: revision,
    storageBucket: "private-bucket",
    storagePath: "owner/document/file.pdf",
  };
}

function contractBill() {
  const { storageBucket, storagePath, createdAt, ...bill } = storedBill();
  void storageBucket; void storagePath; void createdAt;
  return { contentComplete: true, ...bill };
}

test("Office bill contracts are exact, bounded and owner-free", () => {
  const snapshot = parseOfficeBillsSnapshot({
    schemaVersion: OFFICE_BILLS_SCHEMA_VERSION,
    revision,
    bills: [contractBill()],
  });
  assert.equal(snapshot.bills[0]?.title, "Electricity");
  assert.equal("storagePath" in snapshot.bills[0]!, false);
  assert.throws(() => parseOfficeBillsSnapshot({
    schemaVersion: OFFICE_BILLS_SCHEMA_VERSION,
    revision,
    bills: [{ ...contractBill(), ownerId: "other-user" }],
  }), /unsupported/i);
  assert.throws(() => parseOfficeBillMutation({
    operation: "SAVE_BILL",
    revision,
    billId: "bill-1",
    bill: { ...billFields(), userId: "other-user" },
  }), /unsupported/i);
});

test("Office projection strips storage controls and preserves a bounded history", () => {
  const payload = {
    unrelatedPrivateState: { retained: true },
    bills: { bills: [storedBill()] },
  };
  const snapshot = projectOfficeBillsSnapshot(payload, revision);
  assert.equal(snapshot.revision, revision);
  assert.equal(snapshot.bills[0]?.documentId, "document-1");
  assert.equal(JSON.stringify(snapshot).includes("private-bucket"), false);
  assert.ok(Buffer.byteLength(JSON.stringify(snapshot), "utf8") < 480 * 1024);
});

test("Office bill projection fits multibyte notes to the wire-byte ceiling", () => {
  const bills = Array.from({ length: 300 }, (_, index) => ({
    ...storedBill(),
    id: `bill-${index}`,
    documentId: null,
    notes: `${index}:${"界".repeat(3_990)}`,
    history: [],
  }));
  const snapshot = projectOfficeBillsSnapshot({ bills: { bills } }, revision);
  assert.equal(snapshot.bills.length, 300);
  assert.ok(snapshot.bills.every((entry) => entry.notes.length > 0));
  assert.ok(snapshot.bills.some((entry) => !entry.contentComplete));
  assert.ok(Buffer.byteLength(JSON.stringify(snapshot), "utf8") <= 480 * 1024);
});

test("complete bill details are exact and independently projectable", () => {
  const detail = projectOfficeBillDetail({ bills: { bills: [storedBill()] } }, "bill-1");
  assert.equal(detail?.schemaVersion, OFFICE_BILL_DETAIL_SCHEMA_VERSION);
  assert.equal(detail?.bill.contentComplete, true);
  assert.equal(detail?.bill.notes, "Check meter reading");
  assert.equal(detail?.bill.history.length, 1);
  assert.deepEqual(parseOfficeBillDetail(detail), detail);
  assert.equal(projectOfficeBillDetail({ bills: { bills: [storedBill()] } }, "missing"), null);
  assert.throws(() => parseOfficeBillDetail({ ...detail, extra: true }), /unsupported/i);
  assert.throws(() => parseOfficeBillMutation({
    operation: "SAVE_BILL", revision, billId: "bill-1",
    bill: { ...billFields(), contentComplete: true },
  }), /unsupported/i);
});

test("Office bill mutation preserves unrelated and immutable document state", () => {
  const source = {
    unrelatedPrivateState: { retained: true },
    bills: { bills: [storedBill()] },
  };
  const mutation = parseOfficeBillMutation({
    operation: "SAVE_BILL",
    revision,
    billId: "bill-1",
    bill: { ...billFields(), amount: 91.5 },
  });
  const result = mutateOfficeBillsPayload(source, mutation, () => "fixed", revision);
  assert.equal(result.status, "OK");
  if (result.status !== "OK") return;
  assert.deepEqual(result.payload.unrelatedPrivateState, source.unrelatedPrivateState);
  const updated = (result.payload.bills as { bills: Array<Record<string, unknown>> }).bills[0]!;
  assert.equal(updated.storagePath, storedBill().storagePath);
  assert.equal((updated.history as unknown[]).length, 2);
  assert.deepEqual(result.document, {
    id: "document-1",
    title: "Electricity",
    provider: "Example Energy",
    dueDate: "2026-10-01",
  });
});

test("mobile Office API is owner-derived, revisioned, bounded and atomic", async () => {
  const [route, server, migration] = await Promise.all([
    read("app/api/mobile/office/bills/route.ts"),
    read("lib/office/mobile-bills-server.ts"),
    read("supabase/migrations/20260904202000_mobile_office_service_boundary.sql"),
  ]);
  assert.match(route, /authenticateHybridRequest/);
  assert.match(route, /parseOfficeBillDetailRequest/);
  assert.match(route, /readBoundedJson\(request, 16 \* 1024\)/);
  assert.match(route, /checkServerRateLimit/);
  assert.match(route, /getSupabaseAdminClient/);
  assert.match(route, /RequestObservation/);
  assert.doesNotMatch(route, /body\.ownerId|body\.userId/);
  assert.match(server, /mutation\.revision !== snapshot\.revision/);
  assert.match(server, /projectOfficeBillDetail/);
  assert.match(server, /apply_mobile_office_state/);
  assert.match(server, /input_document_kind: "bill"/);
  assert.match(migration, /auth\.role\(\) is distinct from 'service_role'/);
  assert.match(migration, /where id::text = document_id and user_id = input_user_id/);
  assert.match(migration, /apply_mobile_bill_state[\s\S]*authenticated, service_role/);
});

test("native Office bills use encrypted cache and dedicated navigation", async () => {
  const [app, screen, workspace, editors, hook, client] = await Promise.all([
    read("apps/mobile/src/SignedInRoom.tsx"),
    read("apps/mobile/src/office/OfficeScreen.tsx"),
    read("apps/mobile/src/office/use-office-workspace.ts"),
    read("apps/mobile/src/office/OfficeEditors.tsx"),
    read("apps/mobile/src/office/use-office-bills.ts"),
    read("apps/mobile/src/office/bills-client.ts"),
  ]);
  assert.match(app, /profile\.id === "office"/);
  assert.match(screen, /<OfficeEditors/);
  assert.match(workspace, /SAVE_BILL/);
  assert.match(workspace, /loadBill/);
  assert.match(editors, /<BillEditor/);
  assert.match(hook, /tryPutReadModel\(/);
  assert.match(hook, /readModelCacheKey\("office-bill"/);
  assert.match(hook, /OfficeBillsConflictError/);
  assert.doesNotMatch(hook, /localStorage|sessionStorage|indexedDB/i);
  assert.match(client, /Authorization: authorization/);
  assert.match(client, /requestDeadline/);
  assert.match(client, /parseOfficeBillDetail/);
});
