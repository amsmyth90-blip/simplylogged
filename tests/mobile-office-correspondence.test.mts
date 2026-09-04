import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  OFFICE_CORRESPONDENCE_DETAIL_SCHEMA_VERSION,
  parseOfficeCorrespondenceDetail,
  parseOfficeCorrespondenceMutation,
  parseOfficeCorrespondenceSnapshot,
  parseSaveOfficeCorrespondence,
  type SaveOfficeCorrespondence,
} from "../packages/office/src/index.ts";
import { mutateOfficeCorrespondencePayload } from "../lib/office/mobile-correspondence-mutation.ts";
import { projectOfficeCorrespondenceDetail,
  projectOfficeCorrespondenceSnapshot } from "../lib/office/mobile-correspondence-payload.ts";

const correspondence: SaveOfficeCorrespondence = {
  title: "Council tax notice",
  sender: "Example Council",
  correspondenceType: "Letter",
  folder: "Government & HMRC",
  receivedDate: "2026-09-01",
  deadline: "2026-09-30",
  status: "action-needed",
  summary: "Check the balance and respond before the deadline.",
  actions: [{ id: "action-1", label: "Check the balance", completed: false }],
  contactName: "Council tax team",
  contactPhone: "020 0000 0000",
  contactUrl: "https://council.example.test/tax",
  linkedReminderIds: ["reminder-1"],
  linkedBillId: "bill-1",
  linkedPolicyId: null,
  responses: [{ id: "response-1", note: "Called the council.", createdAt: "2026-09-02T09:00:00.000Z" }],
};

test("Office correspondence contracts are exact, bounded and owner-free", () => {
  assert.deepEqual(parseSaveOfficeCorrespondence(correspondence), correspondence);
  assert.throws(() => parseSaveOfficeCorrespondence({ ...correspondence, userId: "other" }));
  assert.throws(() => parseSaveOfficeCorrespondence({ ...correspondence, storagePath: "private" }));
  assert.throws(() => parseSaveOfficeCorrespondence({ ...correspondence, contactUrl: "javascript:alert(1)" }));
  assert.throws(() => parseOfficeCorrespondenceMutation({
    operation: "SAVE_CORRESPONDENCE", revision: null,
    correspondenceId: null, correspondence, owner: "other",
  }));
});

test("correspondence projection strips storage controls and bounds collections", () => {
  const snapshot = projectOfficeCorrespondenceSnapshot({
    correspondence: { correspondence: [{
      contentComplete: true,
      id: "letter-1", documentId: "document-1", storageBucket: "secret",
      storagePath: "user/private.pdf", extractedText: "private extraction",
      reviewStatus: "reviewed", updatedAt: "2026-09-02T09:00:00.000Z",
      ...correspondence,
      actions: Array.from({ length: 40 }, (_, index) => ({
        id: `action-${index}`, label: `Action ${index}`, completed: false,
      })),
      responses: Array.from({ length: 120 }, (_, index) => ({
        id: `response-${index}`, note: `Response ${index}`,
        createdAt: "2026-09-02T09:00:00.000Z",
      })),
    }] },
  }, "2026-09-02T10:00:00.000Z");
  assert.equal(snapshot.correspondence[0]?.actions.length, 24);
  assert.equal(snapshot.correspondence[0]?.responses.length, 100);
  assert.equal(JSON.stringify(snapshot).includes("storagePath"), false);
  assert.equal(JSON.stringify(snapshot).includes("extractedText"), false);
  assert.deepEqual(parseOfficeCorrespondenceSnapshot(snapshot), snapshot);
});

test("correspondence projection fairly fits a multibyte large account", () => {
  const source = Array.from({ length: 300 }, (_, index) => ({
    id: `letter-${index}`, documentId: null, reviewStatus: "reviewed",
    updatedAt: "2026-09-02T09:00:00.000Z", ...correspondence,
    summary: `${index}:${"界".repeat(3_990)}`,
    actions: [{ id: `action-${index}`, label: `${index}:${"取".repeat(230)}`, completed: false }],
    responses: [{ id: `response-${index}`, note: `${index}:${"話".repeat(1_990)}`,
      createdAt: "2026-09-02T09:00:00.000Z" }],
  }));
  const snapshot = projectOfficeCorrespondenceSnapshot({
    correspondence: { correspondence: source },
  }, null);
  assert.equal(snapshot.correspondence.length, 300);
  assert.ok(snapshot.correspondence.every((item) => item.summary.length > 0));
  assert.ok(snapshot.correspondence.every((item) => item.actions.length > 0));
  assert.ok(snapshot.correspondence.some((item) => !item.contentComplete));
  assert.ok(Buffer.byteLength(JSON.stringify(snapshot), "utf8") <= 480 * 1024);
});

test("complete correspondence detail is exact and independently projectable", () => {
  const stored = { id: "letter-1", documentId: "document-1", reviewStatus: "reviewed",
    updatedAt: "2026-09-02T09:00:00.000Z", ...correspondence };
  const detail = projectOfficeCorrespondenceDetail(
    { correspondence: { correspondence: [stored] } }, "letter-1",
  );
  assert.equal(detail?.schemaVersion, OFFICE_CORRESPONDENCE_DETAIL_SCHEMA_VERSION);
  assert.equal(detail?.correspondence.contentComplete, true);
  assert.equal(detail?.correspondence.responses.length, 1);
  assert.deepEqual(parseOfficeCorrespondenceDetail(detail), detail);
  assert.equal(projectOfficeCorrespondenceDetail(
    { correspondence: { correspondence: [stored] } }, "missing"), null);
  assert.throws(() => parseSaveOfficeCorrespondence({
    ...correspondence, contentComplete: true,
  }), /unsupported/i);
});

test("correspondence mutation preserves unrelated and immutable private fields", () => {
  const current = {
    emergency: { contacts: [{ id: "keep" }] },
    correspondence: { correspondence: [{
      id: "letter-1", documentId: "document-1", storageBucket: "secret",
      storagePath: "user/private.pdf", extractedText: "keep private text",
      reviewStatus: "needs-review", createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z", ...correspondence,
    }] },
  };
  const result = mutateOfficeCorrespondencePayload(current, {
    operation: "SAVE_CORRESPONDENCE", revision: null,
    correspondenceId: "letter-1",
    correspondence: { ...correspondence, title: "Updated notice" },
  }, () => "unused", "2026-09-02T10:00:00.000Z");
  assert.equal(result.status, "OK");
  if (result.status !== "OK") return;
  assert.deepEqual(result.payload.emergency, current.emergency);
  const saved = (result.payload.correspondence as {
    correspondence: Record<string, unknown>[];
  }).correspondence[0]!;
  assert.equal(saved.documentId, "document-1");
  assert.equal(saved.storagePath, "user/private.pdf");
  assert.equal(saved.extractedText, "keep private text");
  assert.equal(saved.reviewStatus, "reviewed");
  assert.deepEqual(result.document, {
    id: "document-1", title: "Updated notice",
    sender: "Example Council", deadline: "2026-09-30",
  });
});

test("mobile correspondence API is owner-derived, bounded, revisioned and atomic", async () => {
  const route = await readFile("app/api/mobile/office/correspondence/route.ts", "utf8");
  const server = await readFile("lib/office/mobile-correspondence-server.ts", "utf8");
  const migration = await readFile(
    "supabase/migrations/20260904202000_mobile_office_service_boundary.sql", "utf8");
  assert.match(route, /authenticateHybridRequest/);
  assert.match(route, /parseOfficeCorrespondenceDetailRequest/);
  assert.match(route, /readBoundedJson\(request, 256 \* 1024\)/);
  assert.match(route, /checkServerRateLimit/);
  assert.match(route, /getSupabaseAdminClient/);
  assert.match(server, /\.eq\("id", userId\)/);
  assert.match(server, /mutation\.revision !== snapshot\.revision/);
  assert.match(server, /projectOfficeCorrespondenceDetail/);
  assert.match(server, /apply_mobile_office_state/);
  assert.match(server, /input_document_kind: "correspondence"/);
  assert.match(migration, /security definer/i);
  assert.match(migration, /auth\.role\(\) is distinct from 'service_role'/);
  assert.match(migration, /where id = document_id and user_id = input_user_id/);
  assert.match(migration, /apply_mobile_correspondence_state[\s\S]*authenticated, service_role/);
});

test("native correspondence uses encrypted cache and full Office controls", async () => {
  const hook = await readFile("apps/mobile/src/office/use-office-correspondence.ts", "utf8");
  const client = await readFile("apps/mobile/src/office/correspondence-client.ts", "utf8");
  const screen = await readFile("apps/mobile/src/office/OfficeScreen.tsx", "utf8");
  const content = await readFile("apps/mobile/src/office/OfficeContent.tsx", "utf8");
  const editors = await readFile("apps/mobile/src/office/OfficeEditors.tsx", "utf8");
  const editor = await readFile("apps/mobile/src/office/CorrespondenceEditor.tsx", "utf8");
  assert.match(hook, /tryPutReadModel/);
  assert.match(hook, /readModelCacheKey/);
  assert.match(hook, /CACHE_KEY = "office-correspondence"/);
  assert.match(hook, /Connect to change Office correspondence/);
  assert.match(client, /\/api\/mobile\/office\/correspondence/);
  assert.match(client, /requestDeadline\(20_000\)/);
  assert.match(client, /parseOfficeCorrespondenceDetail/);
  assert.match(screen, /<OfficeContent/);
  assert.match(screen, /<OfficeEditors/);
  assert.match(content, /<CorrespondencePanel/);
  assert.match(editors, /<CorrespondenceEditor/);
  assert.match(editor, /Actions required/);
  assert.match(editor, /Follow-up log/);
  assert.match(editor, /Add deadline reminder/);
});
