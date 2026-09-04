import {
  OFFICE_BILL_DETAIL_SCHEMA_VERSION,
  OFFICE_BILLS_SCHEMA_VERSION,
  officeBillCategories,
  officeBillFrequencies,
  officeBillStatuses,
  parseOfficeBillDetail,
  parseOfficeBillsSnapshot,
  type OfficeBill,
  type OfficeBillHistory,
  type OfficeBillsSnapshot,
} from "@diarydock/office";

import { jsonUtf8Bytes } from "../serialization/json-size.ts";

type JsonRecord = Record<string, unknown>;
const MOBILE_SNAPSHOT_LIMIT = 480 * 1024;

function object(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function text(value: unknown, maximum: number) {
  return typeof value === "string" ? value.slice(0, maximum).trim() : "";
}

function number(value: unknown, maximum = 10_000_000) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= maximum
    ? value
    : 0;
}

function date(value: unknown) {
  const candidate = text(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : "";
}

function history(value: unknown): OfficeBillHistory | null {
  const item = object(value);
  const id = text(item.id, 128);
  if (!id) return null;
  return {
    id,
    amount: number(item.amount),
    dueDate: date(item.dueDate),
    recordedAt: text(item.recordedAt, 40) || new Date(0).toISOString(),
  };
}

export function projectOfficeBill(value: unknown): OfficeBill | null {
  const item = object(value);
  const id = text(item.id, 128);
  const title = text(item.title, 160);
  const provider = text(item.provider, 160);
  if (!id || (!title && !provider)) return null;
  const status = officeBillStatuses.includes(item.status as never) ? item.status : "draft";
  return {
    contentComplete: true,
    id,
    documentId: text(item.documentId, 128) || null,
    title: title || `${provider} bill`,
    provider,
    category: officeBillCategories.includes(item.category as never) ? item.category as OfficeBill["category"] : "Other",
    accountNumberMasked: text(item.accountNumberMasked, 80),
    amount: number(item.amount),
    dueDate: date(item.dueDate),
    frequency: officeBillFrequencies.includes(item.frequency as never)
      ? item.frequency as OfficeBill["frequency"] : "one-off",
    paymentMethod: text(item.paymentMethod, 120),
    directDebit: item.directDebit === true,
    status: status as OfficeBill["status"],
    reviewStatus: item.reviewStatus === "reviewed" ? "reviewed" : "needs-review",
    billingPeriodStart: date(item.billingPeriodStart),
    billingPeriodEnd: date(item.billingPeriodEnd),
    contractEndDate: date(item.contractEndDate),
    noticePeriodDays: Number.isSafeInteger(item.noticePeriodDays)
      && Number(item.noticePeriodDays) >= 0 && Number(item.noticePeriodDays) <= 3_650
      ? Number(item.noticePeriodDays) : null,
    usage: text(item.usage, 240),
    notes: text(item.notes, 4_000),
    history: (Array.isArray(item.history) ? item.history : []).slice(-200)
      .map(history).filter((entry): entry is OfficeBillHistory => Boolean(entry)),
    updatedAt: text(item.updatedAt, 40) || new Date(0).toISOString(),
  };
}

function fitHistories(bills: OfficeBill[], revision: string | null) {
  const fitted = bills.map((item) => ({ ...item, contentComplete: false,
    notes: "", history: [] as OfficeBillHistory[] }));
  let size = jsonUtf8Bytes({ schemaVersion: OFFICE_BILLS_SCHEMA_VERSION, revision, bills: fitted });
  if (size > MOBILE_SNAPSHOT_LIMIT) throw new Error("Office bills exceed the safe mobile record limit.");
  let offset = 0;
  let addedNotes = true;
  while (addedNotes) {
    addedNotes = false;
    for (let index = 0; index < bills.length; index += 1) {
      const chunk = bills[index]!.notes.slice(offset, offset + 64);
      const current = fitted[index]!.notes;
      const delta = jsonUtf8Bytes(current + chunk) - jsonUtf8Bytes(current);
      if (!chunk || size + delta > MOBILE_SNAPSHOT_LIMIT) continue;
      fitted[index]!.notes = current + chunk;
      size += delta;
      addedNotes = true;
    }
    offset += 64;
  }
  let round = 0;
  let added = true;
  while (added) {
    added = false;
    for (let index = 0; index < bills.length; index += 1) {
      const entry = bills[index]?.history[bills[index]!.history.length - 1 - round];
      if (!entry) continue;
      const entrySize = jsonUtf8Bytes(entry) + 1;
      if (size + entrySize > MOBILE_SNAPSHOT_LIMIT) continue;
      fitted[index]!.history.unshift(entry);
      size += entrySize;
      added = true;
    }
    round += 1;
  }
  for (let index = 0; index < bills.length; index += 1) {
    const source = bills[index]!;
    fitted[index]!.contentComplete = fitted[index]!.notes === source.notes
      && fitted[index]!.history.length === source.history.length;
  }
  return fitted;
}

export function projectOfficeBillsSnapshot(
  payload: unknown,
  revision: string | null,
): OfficeBillsSnapshot {
  const root = object(payload);
  const billsRecord = object(root.bills);
  const bills = (Array.isArray(billsRecord.bills) ? billsRecord.bills : [])
    .slice(0, 500).map(projectOfficeBill)
    .filter((entry): entry is OfficeBill => Boolean(entry));
  return parseOfficeBillsSnapshot({
    schemaVersion: OFFICE_BILLS_SCHEMA_VERSION,
    revision,
    bills: fitHistories(bills, revision),
  });
}

export function projectOfficeBillDetail(payload: unknown, billId: string) {
  const billsRecord = object(object(payload).bills);
  const value = (Array.isArray(billsRecord.bills) ? billsRecord.bills : [])
    .slice(0, 500).find((entry) => text(object(entry).id, 128) === billId);
  const projected = projectOfficeBill(value);
  if (!projected) return null;
  return parseOfficeBillDetail({ schemaVersion: OFFICE_BILL_DETAIL_SCHEMA_VERSION,
    bill: projected });
}

export { mutateOfficeBillsPayload } from "./mobile-bills-mutation.ts";
