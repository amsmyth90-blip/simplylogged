import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

import {
  OFFICE_CONTACT_DETAIL_SCHEMA_VERSION,
  parseOfficeContactDetail,
  parseOfficeContactCsv,
  parseOfficeContactsMutation,
  parseOfficeContactsSnapshot,
  parseSaveOfficeContact,
  type SaveOfficeContact,
} from "../packages/office/src/index.ts";
import { mutateOfficeContactsPayload } from "../lib/office/mobile-contacts-mutation.ts";
import { projectOfficeContactDetail,
  projectOfficeContactsSnapshot } from "../lib/office/mobile-contacts-payload.ts";

const contact: SaveOfficeContact = {
  firstName: "Priya",
  lastName: "Shah",
  role: "Family solicitor",
  company: "Shah & Moss",
  category: "Legal",
  phone: "020 7946 0123",
  email: "priya@example.test",
  address: "10 Market Square",
  notes: "Primary contact for estate planning.",
  isFavourite: true,
  isEmergencyContact: false,
  nextReviewDate: "2027-03-12",
  linkedDocumentIds: ["document-1"],
  linkedPolicyIds: ["policy-1"],
  linkedContractIds: ["contract-1"],
  linkedBillIds: ["bill-1"],
  contactNotes: [{
    id: "note-1",
    note: "Confirmed the annual review.",
    createdAt: "2026-09-04T09:00:00.000Z",
  }],
  meetings: [{
    id: "meeting-1",
    title: "Annual review",
    date: "2026-10-08",
    time: "10:30",
    notes: "Bring the will summary.",
    completed: false,
    createdAt: "2026-09-04T09:00:00.000Z",
  }],
};

test("Office contact contracts are exact, bounded and owner-free", () => {
  assert.deepEqual(parseSaveOfficeContact(contact), contact);
  assert.throws(() => parseSaveOfficeContact({ ...contact, userId: "other" }));
  assert.throws(() => parseSaveOfficeContact({ ...contact, meetings: [{
    ...contact.meetings[0], time: "25:90",
  }] }));
  assert.throws(() => parseOfficeContactsMutation({
    operation: "DELETE_CONTACT", revision: null, contactId: "contact-1", owner: "other",
  }));
  assert.throws(() => parseOfficeContactsMutation({
    operation: "IMPORT_CONTACTS", revision: null, contacts: [],
  }));
});

test("contact CSV import is bounded and handles quoted records", () => {
  const contacts = parseOfficeContactCsv(
    "Name,Role,Company,Category,Notes\r\n\"Priya Shah\",Solicitor,\"Shah, Moss\",Legal,\"Line one\nLine two\"",
  );
  assert.equal(contacts.length, 1);
  assert.equal(contacts[0]?.firstName, "Priya");
  assert.equal(contacts[0]?.company, "Shah, Moss");
  assert.equal(contacts[0]?.notes, "Line one\nLine two");
  const withUnmappedRow = parseOfficeContactCsv(
    "Name,Unused\n,ignore this row\nDaniel Reed,kept",
  );
  assert.equal(withUnmappedRow.length, 1);
  assert.equal(withUnmappedRow[0]?.firstName, "Daniel");
  assert.throws(() => parseOfficeContactCsv("x".repeat(256 * 1024 + 1)), /too large/);
});

test("contact projection strips unknown state and bounds nested history", () => {
  const snapshot = projectOfficeContactsSnapshot({
    professionalContacts: { contacts: [{
      id: "contact-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-09-04T09:00:00.000Z",
      privateToken: "secret",
      ...contact,
      contactNotes: Array.from({ length: 120 }, (_, index) => ({
        id: `note-${index}`, note: `Note ${index}`, createdAt: "2026-09-04T09:00:00.000Z",
      })),
      meetings: Array.from({ length: 120 }, (_, index) => ({
        id: `meeting-${index}`, title: `Meeting ${index}`, date: "2026-10-08",
        time: "10:30", notes: "", completed: false,
        createdAt: "2026-09-04T09:00:00.000Z",
      })),
    }] },
  }, "2026-09-04T10:00:00.000Z");
  assert.equal(snapshot.contacts[0]?.contactNotes.length, 100);
  assert.equal(snapshot.contacts[0]?.meetings.length, 100);
  assert.equal(JSON.stringify(snapshot).includes("privateToken"), false);
  assert.deepEqual(parseOfficeContactsSnapshot(snapshot), snapshot);
});

test("contact projection fairly fits a multibyte large account", () => {
  const source = Array.from({ length: 300 }, (_, index) => ({
    id: `contact-${index}`,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-09-04T09:00:00.000Z",
    ...contact,
    firstName: `${index}-${"界".repeat(110)}`,
    lastName: "名".repeat(110),
    role: "役".repeat(150),
    company: "社".repeat(190),
    address: `${index}:${"所".repeat(990)}`,
    notes: `${index}:${"話".repeat(3_990)}`,
  }));
  const snapshot = projectOfficeContactsSnapshot({
    professionalContacts: { contacts: source },
  }, null);
  assert.equal(snapshot.contacts.length, 300);
  assert.ok(snapshot.contacts.every((item) => item.address.length > 0));
  assert.ok(snapshot.contacts.every((item) => item.notes.length > 0));
  assert.ok(snapshot.contacts.some((item) => !item.contentComplete));
  assert.ok(Buffer.byteLength(JSON.stringify(snapshot), "utf8") <= 480 * 1024);
});

test("complete contact detail is exact and independently projectable", () => {
  const stored = { id: "contact-1", createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-09-04T09:00:00.000Z", ...contact };
  const detail = projectOfficeContactDetail(
    { professionalContacts: { contacts: [stored] } }, "contact-1",
  );
  assert.equal(detail?.schemaVersion, OFFICE_CONTACT_DETAIL_SCHEMA_VERSION);
  assert.equal(detail?.contact.contentComplete, true);
  assert.equal(detail?.contact.meetings.length, 1);
  assert.deepEqual(parseOfficeContactDetail(detail), detail);
  assert.equal(projectOfficeContactDetail(
    { professionalContacts: { contacts: [stored] } }, "missing"), null);
  assert.throws(() => parseSaveOfficeContact({ ...contact, contentComplete: true }), /unsupported/i);
});

test("contact mutations preserve unrelated state, identity and import rules", () => {
  const current = {
    emergency: { contacts: [{ id: "keep" }] },
    professionalContacts: { contacts: [{
      id: "contact-1",
      createdAt: "2025-01-01T00:00:00.000Z",
      privateField: "keep",
      ...contact,
    }] },
  };
  const updated = mutateOfficeContactsPayload(current, {
    operation: "SAVE_CONTACT", revision: null, contactId: "contact-1",
    contact: { ...contact, role: "Senior solicitor" },
  }, () => "unused", "2026-09-04T10:00:00.000Z");
  assert.equal(updated.status, "OK");
  if (updated.status !== "OK") return;
  assert.deepEqual(updated.payload.emergency, current.emergency);
  const saved = (updated.payload.professionalContacts as {
    contacts: Record<string, unknown>[];
  }).contacts[0]!;
  assert.equal(saved.id, "contact-1");
  assert.equal(saved.createdAt, "2025-01-01T00:00:00.000Z");
  assert.equal(saved.privateField, "keep");

  let counter = 0;
  const imported = mutateOfficeContactsPayload(updated.payload, {
    operation: "IMPORT_CONTACTS", revision: null,
    contacts: [contact, { ...contact, email: "second@example.test" }],
  }, () => `new-${++counter}`, "2026-09-04T11:00:00.000Z");
  assert.equal(imported.status, "OK");
  if (imported.status !== "OK") return;
  const records = (imported.payload.professionalContacts as { contacts: unknown[] }).contacts;
  assert.equal(records.length, 2);
});

test("contact database writes are service-only and revision checked", async () => {
  const database = new PGlite();
  const migration = await readFile(
    "supabase/migrations/20260904100000_mobile_contact_transaction.sql", "utf8",
  );
  try {
    await database.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.role() returns text language sql stable as $$
        select nullif(current_setting('request.jwt.claim.role', true), '')
      $$;
      create table public.app_state(
        id text primary key, payload jsonb not null,
        updated_at timestamptz not null default timezone('utc', now())
      );
    `);
    await database.exec(migration);
    const userId = "11111111-1111-4111-8111-111111111111";
    await database.query("insert into auth.users(id) values ($1)", [userId]);
    await database.query("select set_config('request.jwt.claim.role', 'authenticated', false)");
    await database.exec("set role authenticated");
    await assert.rejects(database.query(
      "select public.apply_mobile_contact_state($1, null, '{}'::jsonb)", [userId],
    ), /permission denied|Service role required/i);
    await database.exec("reset role");
    await database.query("select set_config('request.jwt.claim.role', 'service_role', false)");
    await database.exec("set role service_role");
    const result = await database.query<{ payload: unknown }>(
      "select payload from public.apply_mobile_contact_state($1, null, $2::jsonb)",
      [userId, JSON.stringify({ professionalContacts: { contacts: [] } })],
    );
    assert.deepEqual(result.rows[0]?.payload, { professionalContacts: { contacts: [] } });
  } finally {
    await database.close();
  }
});

test("mobile contacts use bounded APIs, encrypted cache and full Office controls", async () => {
  const [route, server, migration, hook, client, screen, editor, importer] = await Promise.all([
    readFile("app/api/mobile/office/contacts/route.ts", "utf8"),
    readFile("lib/office/mobile-contacts-server.ts", "utf8"),
    readFile("supabase/migrations/20260904100000_mobile_contact_transaction.sql", "utf8"),
    readFile("apps/mobile/src/office/use-office-contacts.ts", "utf8"),
    readFile("apps/mobile/src/office/contacts-client.ts", "utf8"),
    readFile("apps/mobile/src/office/OfficeScreen.tsx", "utf8"),
    readFile("apps/mobile/src/office/ContactEditor.tsx", "utf8"),
    readFile("apps/mobile/src/office/ContactImport.tsx", "utf8"),
  ]);
  assert.match(route, /authenticateHybridRequest/);
  assert.match(route, /parseOfficeContactDetailRequest/);
  assert.match(route, /readBoundedJson\(request, 256 \* 1024\)/);
  assert.match(route, /getSupabaseAdminClient/);
  assert.match(server, /\.eq\("id", userId\)/);
  assert.match(server, /mutation\.revision !== snapshot\.revision/);
  assert.match(server, /projectOfficeContactDetail/);
  assert.match(server, /apply_mobile_contact_state/);
  assert.match(migration, /auth\.role\(\) is distinct from 'service_role'/);
  assert.match(migration, /revoke all[\s\S]*authenticated/);
  assert.match(hook, /tryPutReadModel/);
  assert.match(hook, /readModelCacheKey/);
  assert.match(hook, /CACHE_KEY = "office-contacts"/);
  assert.match(client, /\/api\/mobile\/office\/contacts/);
  assert.match(client, /parseOfficeContactDetail/);
  assert.match(screen, /<OfficeEditors/);
  assert.match(editor, /<ContactHistory/);
  assert.match(editor, /Delete contact/);
  assert.match(importer, /file\.size > 256 \* 1024[\s\S]*file\.text\(\)/);
});
