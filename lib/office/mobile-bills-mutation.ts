import type { OfficeBillMutation } from "@diarydock/office";

type JsonRecord = Record<string, unknown>;
type MutationResult =
  | { status: "OK"; payload: JsonRecord; document: JsonRecord | null }
  | { status: "CAPACITY" | "NOT_FOUND"; payload: null; document: null };

function object(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function historyFor(current: JsonRecord, amount: number, dueDate: string, now: string) {
  const history = Array.isArray(current.history) ? [...current.history] : [];
  const changed = current.reviewStatus === "reviewed"
    && (current.amount !== amount || current.dueDate !== dueDate);
  if (!changed && history.length) return history;
  if (history.length >= 200) history.shift();
  return [...history, { id: crypto.randomUUID(), amount, dueDate, recordedAt: now }];
}

export function mutateOfficeBillsPayload(
  current: unknown,
  mutation: OfficeBillMutation,
  createId: () => string = () => crypto.randomUUID(),
  now = new Date().toISOString(),
): MutationResult {
  const payload = structuredClone(object(current));
  const billsRecord = object(payload.bills);
  const bills = Array.isArray(billsRecord.bills) ? [...billsRecord.bills] : [];
  if (!mutation.billId && bills.length >= 500) {
    return { status: "CAPACITY", payload: null, document: null };
  }
  const index = mutation.billId
    ? bills.findIndex((entry) => object(entry).id === mutation.billId)
    : -1;
  if (mutation.billId && index < 0) {
    return { status: "NOT_FOUND", payload: null, document: null };
  }
  const previous = index >= 0 ? object(bills[index]) : {};
  const id = mutation.billId ?? createId();
  const title = mutation.bill.title || `${mutation.bill.provider} bill`;
  const next = {
    ...previous,
    ...mutation.bill,
    id,
    title,
    status: mutation.bill.status === "draft" ? "active" : mutation.bill.status,
    reviewStatus: "reviewed",
    history: historyFor(previous, mutation.bill.amount, mutation.bill.dueDate, now),
    createdAt: previous.createdAt ?? now,
    updatedAt: now,
  };
  if (index >= 0) bills[index] = next;
  else bills.unshift(next);
  payload.bills = { ...billsRecord, bills };
  const documentId = typeof previous.documentId === "string" ? previous.documentId : null;
  return {
    status: "OK",
    payload,
    document: documentId ? {
      id: documentId,
      title,
      provider: mutation.bill.provider,
      dueDate: mutation.bill.dueDate,
    } : null,
  };
}
