import type { OfficeCorrespondenceMutation } from "@diarydock/office";

type JsonRecord = Record<string, unknown>;
type MutationResult =
  | { status: "OK"; payload: JsonRecord; document: JsonRecord | null }
  | { status: "CAPACITY" | "NOT_FOUND"; payload: null; document: null };

function object(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

export function mutateOfficeCorrespondencePayload(
  current: unknown,
  mutation: OfficeCorrespondenceMutation,
  createId: () => string = () => crypto.randomUUID(),
  now = new Date().toISOString(),
): MutationResult {
  const payload = structuredClone(object(current));
  const collection = object(payload.correspondence);
  const records = Array.isArray(collection.correspondence)
    ? [...collection.correspondence]
    : [];
  if (!mutation.correspondenceId && records.length >= 300) {
    return { status: "CAPACITY", payload: null, document: null };
  }
  const index = mutation.correspondenceId
    ? records.findIndex((entry) => object(entry).id === mutation.correspondenceId)
    : -1;
  if (mutation.correspondenceId && index < 0) {
    return { status: "NOT_FOUND", payload: null, document: null };
  }
  const previous = index >= 0 ? object(records[index]) : {};
  const id = mutation.correspondenceId ?? createId();
  const title = mutation.correspondence.title
    || `${mutation.correspondence.sender} correspondence`;
  const next = {
    ...previous,
    ...mutation.correspondence,
    id,
    title,
    reviewStatus: "reviewed",
    createdAt: previous.createdAt ?? now,
    updatedAt: now,
  };
  if (index >= 0) records[index] = next;
  else records.unshift(next);
  payload.correspondence = { ...collection, correspondence: records };
  const documentId = typeof previous.documentId === "string" ? previous.documentId : null;
  return {
    status: "OK",
    payload,
    document: documentId ? {
      id: documentId,
      title,
      sender: mutation.correspondence.sender,
      deadline: mutation.correspondence.deadline,
    } : null,
  };
}
