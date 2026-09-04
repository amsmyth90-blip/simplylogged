import type { OfficeContractMutation } from "@diarydock/office";

type JsonRecord = Record<string, unknown>;
type MutationResult =
  | { status: "OK"; payload: JsonRecord; document: JsonRecord | null }
  | { status: "CAPACITY" | "NOT_FOUND"; payload: null; document: null };

function object(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function priceHistory(current: JsonRecord, amount: number, effectiveDate: string, now: string) {
  const history = Array.isArray(current.priceHistory) ? [...current.priceHistory] : [];
  const latest = object(history.at(-1));
  if (latest.amount === amount && history.length) return history;
  if (history.length >= 200) history.shift();
  return [...history, { id: crypto.randomUUID(), amount, effectiveDate, recordedAt: now }];
}

export function mutateOfficeContractsPayload(
  current: unknown,
  mutation: OfficeContractMutation,
  createId: () => string = () => crypto.randomUUID(),
  now = new Date().toISOString(),
): MutationResult {
  const payload = structuredClone(object(current));
  const contractsRecord = object(payload.contracts);
  const contracts = Array.isArray(contractsRecord.contracts) ? [...contractsRecord.contracts] : [];
  if (!mutation.contractId && contracts.length >= 300) {
    return { status: "CAPACITY", payload: null, document: null };
  }
  const index = mutation.contractId
    ? contracts.findIndex((entry) => object(entry).id === mutation.contractId) : -1;
  if (mutation.contractId && index < 0) {
    return { status: "NOT_FOUND", payload: null, document: null };
  }
  const previous = index >= 0 ? object(contracts[index]) : {};
  const id = mutation.contractId ?? createId();
  const title = mutation.contract.serviceName || `${mutation.contract.provider} contract`;
  const { cost, ...contract } = mutation.contract;
  const next = {
    ...previous,
    ...contract,
    id,
    serviceName: title,
    monthlyCost: cost,
    reviewStatus: "reviewed",
    priceHistory: priceHistory(previous, cost,
      mutation.contract.startDate || now.slice(0, 10), now),
    lastReviewedAt: now,
    createdAt: previous.createdAt ?? now,
    updatedAt: now,
  };
  if (index >= 0) contracts[index] = next;
  else contracts.unshift(next);
  payload.contracts = { ...contractsRecord, contracts };
  const documentId = typeof previous.documentId === "string" ? previous.documentId : null;
  return {
    status: "OK",
    payload,
    document: documentId ? {
      id: documentId, title, provider: mutation.contract.provider,
      dueDate: mutation.contract.renewalDate || mutation.contract.minimumTermEnd,
    } : null,
  };
}
