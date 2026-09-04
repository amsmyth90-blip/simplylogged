import {
  OFFICE_CONTRACT_DETAIL_SCHEMA_VERSION,
  OFFICE_CONTRACTS_SCHEMA_VERSION,
  officeContractCategories,
  officeContractFrequencies,
  officeContractStatuses,
  parseOfficeContractDetail,
  parseOfficeContractsSnapshot,
  type OfficeContract,
  type OfficeContractPrice,
  type OfficeContractsSnapshot,
} from "@diarydock/office";

import { jsonUtf8Bytes } from "../serialization/json-size.ts";

type JsonRecord = Record<string, unknown>;
const SNAPSHOT_LIMIT = 480 * 1024;

function object(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}
function text(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}
function date(value: unknown) {
  const candidate = text(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : "";
}
function money(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 10_000_000
    ? value : 0;
}
function nullableMoney(value: unknown) {
  return value === null ? null : money(value);
}

function price(value: unknown): OfficeContractPrice | null {
  const item = object(value);
  const id = text(item.id, 128);
  if (!id) return null;
  return { id, amount: money(item.amount), effectiveDate: date(item.effectiveDate),
    recordedAt: text(item.recordedAt, 40) || new Date(0).toISOString() };
}

export function projectOfficeContract(value: unknown): OfficeContract | null {
  const item = object(value);
  const id = text(item.id, 128);
  const serviceName = text(item.serviceName, 160);
  const provider = text(item.provider, 160);
  if (!id || (!serviceName && !provider)) return null;
  return {
    contentComplete: true,
    id,
    documentId: text(item.documentId, 128) || null,
    serviceName,
    provider,
    category: officeContractCategories.includes(item.category as never)
      ? item.category as OfficeContract["category"] : "Other",
    status: officeContractStatuses.includes(item.status as never)
      ? item.status as OfficeContract["status"] : "draft",
    reviewStatus: item.reviewStatus === "reviewed" ? "reviewed" : "needs-review",
    accountEmail: text(item.accountEmail, 254),
    accountNumberMasked: text(item.accountNumberMasked, 80),
    cost: money(item.monthlyCost),
    frequency: officeContractFrequencies.includes(item.frequency as never)
      ? item.frequency as OfficeContract["frequency"] : "monthly",
    paymentMethod: text(item.paymentMethod, 120),
    startDate: date(item.startDate),
    minimumTermEnd: date(item.minimumTermEnd),
    renewalDate: date(item.renewalDate),
    noticePeriodDays: Number.isSafeInteger(item.noticePeriodDays)
      && Number(item.noticePeriodDays) >= 0 && Number(item.noticePeriodDays) <= 3_650
      ? Number(item.noticePeriodDays) : null,
    autoRenew: item.autoRenew === true,
    promotionalPrice: nullableMoney(item.promotionalPrice),
    promotionalEndDate: date(item.promotionalEndDate),
    cancellationInstructions: text(item.cancellationInstructions, 2_000),
    notes: text(item.notes, 4_000),
    priceHistory: (Array.isArray(item.priceHistory) ? item.priceHistory : []).slice(-200)
      .map(price).filter((entry): entry is OfficeContractPrice => Boolean(entry)),
    lastReviewedAt: text(item.lastReviewedAt, 40),
    updatedAt: text(item.updatedAt, 40) || new Date(0).toISOString(),
  };
}

function addTextChunks(fitted: OfficeContract[], source: OfficeContract[], size: number) {
  const fields = ["cancellationInstructions", "notes"] as const;
  let offset = 0;
  let added = true;
  while (added) {
    added = false;
    for (let index = 0; index < source.length; index += 1) {
      for (const field of fields) {
        const chunk = source[index]![field].slice(offset, offset + 32);
        const current = fitted[index]![field];
        const delta = jsonUtf8Bytes(current + chunk) - jsonUtf8Bytes(current);
        if (!chunk || size + delta > SNAPSHOT_LIMIT) continue;
        fitted[index]![field] = current + chunk;
        size += delta;
        added = true;
      }
    }
    offset += 32;
  }
  return size;
}

function fitSnapshot(contracts: OfficeContract[], revision: string | null) {
  const fitted = contracts.map((item) => ({
    ...item,
    contentComplete: false,
    cancellationInstructions: "",
    notes: "",
    priceHistory: [] as OfficeContractPrice[],
  }));
  let size = jsonUtf8Bytes({ schemaVersion: OFFICE_CONTRACTS_SCHEMA_VERSION, revision, contracts: fitted });
  if (size > SNAPSHOT_LIMIT) throw new Error("Office contracts exceed the safe mobile record limit.");
  size = addTextChunks(fitted, contracts, size);
  let round = 0;
  let added = true;
  while (added) {
    added = false;
    for (let index = 0; index < contracts.length; index += 1) {
      const source = contracts[index]!.priceHistory;
      const entry = source[source.length - 1 - round];
      if (!entry) continue;
      const entrySize = jsonUtf8Bytes(entry) + 1;
      if (size + entrySize > SNAPSHOT_LIMIT) continue;
      fitted[index]!.priceHistory.unshift(entry);
      size += entrySize;
      added = true;
    }
    round += 1;
  }
  for (let index = 0; index < contracts.length; index += 1) {
    const source = contracts[index]!; const item = fitted[index]!;
    item.contentComplete = item.notes === source.notes
      && item.cancellationInstructions === source.cancellationInstructions
      && item.priceHistory.length === source.priceHistory.length;
  }
  return fitted;
}

export function projectOfficeContractsSnapshot(payload: unknown, revision: string | null): OfficeContractsSnapshot {
  const contractsRecord = object(object(payload).contracts);
  const contracts = (Array.isArray(contractsRecord.contracts) ? contractsRecord.contracts : [])
    .slice(0, 300).map(projectOfficeContract)
    .filter((entry): entry is OfficeContract => Boolean(entry));
  return parseOfficeContractsSnapshot({
    schemaVersion: OFFICE_CONTRACTS_SCHEMA_VERSION,
    revision,
    contracts: fitSnapshot(contracts, revision),
  });
}

export function projectOfficeContractDetail(payload: unknown, contractId: string) {
  const contractsRecord = object(object(payload).contracts);
  const value = (Array.isArray(contractsRecord.contracts) ? contractsRecord.contracts : [])
    .slice(0, 300).find((entry) => text(object(entry).id, 128) === contractId);
  const contract = projectOfficeContract(value);
  if (!contract) return null;
  return parseOfficeContractDetail({ schemaVersion: OFFICE_CONTRACT_DETAIL_SCHEMA_VERSION,
    contract });
}

export { mutateOfficeContractsPayload } from "./mobile-contracts-mutation.ts";
