import {
  OFFICE_CONTRACT_DETAIL_SCHEMA_VERSION,
  OFFICE_CONTRACTS_SCHEMA_VERSION,
  officeContractCategories,
  officeContractFrequencies,
  officeContractStatuses,
  type OfficeContract,
  type OfficeContractDetail,
  type OfficeContractDetailRequest,
  type OfficeContractPrice,
  type OfficeContractsSnapshot,
  type SaveOfficeContract,
} from "./contract-types.ts";
import {
  boolean, date, exact, finiteNumber, list, nullableInteger, optionalText, record, text,
} from "./validation.ts";

function member<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (!allowed.includes(value as T)) throw new Error(`${label} is invalid.`);
  return value as T;
}

function nullableMoney(value: unknown, label: string) {
  if (value === null) return null;
  return finiteNumber(value, label, 0, 10_000_000);
}

export function parseSaveOfficeContract(value: unknown): SaveOfficeContract {
  const item = record(value, "Contract");
  exact(item, ["serviceName", "provider", "category", "status", "accountEmail",
    "accountNumberMasked", "cost", "frequency", "paymentMethod", "startDate",
    "minimumTermEnd", "renewalDate", "noticePeriodDays", "autoRenew",
    "promotionalPrice", "promotionalEndDate", "cancellationInstructions", "notes"], "Contract");
  const serviceName = text(item.serviceName, "Service name", 160, true);
  const provider = text(item.provider, "Provider", 160, true);
  if (!serviceName && !provider) throw new Error("Add a service name or provider.");
  return {
    serviceName,
    provider,
    category: member(item.category, officeContractCategories, "Contract category"),
    status: member(item.status, officeContractStatuses, "Contract status"),
    accountEmail: text(item.accountEmail, "Account email", 254, true),
    accountNumberMasked: text(item.accountNumberMasked, "Masked account number", 80, true),
    cost: finiteNumber(item.cost, "Contract cost", 0, 10_000_000),
    frequency: member(item.frequency, officeContractFrequencies, "Contract frequency"),
    paymentMethod: text(item.paymentMethod, "Payment method", 120, true),
    startDate: date(item.startDate, "Start date"),
    minimumTermEnd: date(item.minimumTermEnd, "Minimum term end"),
    renewalDate: date(item.renewalDate, "Renewal date"),
    noticePeriodDays: nullableInteger(item.noticePeriodDays, "Notice period", 0, 3_650),
    autoRenew: boolean(item.autoRenew, "Auto-renew choice"),
    promotionalPrice: nullableMoney(item.promotionalPrice, "Promotional price"),
    promotionalEndDate: date(item.promotionalEndDate, "Promotional end date"),
    cancellationInstructions: text(item.cancellationInstructions, "Cancellation instructions", 2_000, true),
    notes: text(item.notes, "Contract notes", 4_000, true),
  };
}

function price(value: unknown): OfficeContractPrice {
  const item = record(value, "Contract price");
  exact(item, ["id", "amount", "effectiveDate", "recordedAt"], "Contract price");
  return {
    id: text(item.id, "Price ID", 128),
    amount: finiteNumber(item.amount, "Price amount", 0, 10_000_000),
    effectiveDate: date(item.effectiveDate, "Price date"),
    recordedAt: text(item.recordedAt, "Price record time", 40),
  };
}

export function parseOfficeContractRecord(value: unknown): OfficeContract {
  const item = record(value, "Contract record");
  exact(item, ["contentComplete", "id", "documentId", "serviceName", "provider", "category", "status",
    "reviewStatus", "accountEmail", "accountNumberMasked", "cost", "frequency",
    "paymentMethod", "startDate", "minimumTermEnd", "renewalDate", "noticePeriodDays",
    "autoRenew", "promotionalPrice", "promotionalEndDate", "cancellationInstructions",
    "notes", "priceHistory", "lastReviewedAt", "updatedAt"], "Contract record");
  const contract = parseSaveOfficeContract({
    serviceName: item.serviceName,
    provider: item.provider,
    category: item.category,
    status: item.status,
    accountEmail: item.accountEmail,
    accountNumberMasked: item.accountNumberMasked,
    cost: item.cost,
    frequency: item.frequency,
    paymentMethod: item.paymentMethod,
    startDate: item.startDate,
    minimumTermEnd: item.minimumTermEnd,
    renewalDate: item.renewalDate,
    noticePeriodDays: item.noticePeriodDays,
    autoRenew: item.autoRenew,
    promotionalPrice: item.promotionalPrice,
    promotionalEndDate: item.promotionalEndDate,
    cancellationInstructions: item.cancellationInstructions,
    notes: item.notes,
  });
  if (item.reviewStatus !== "needs-review" && item.reviewStatus !== "reviewed") {
    throw new Error("Contract review status is invalid.");
  }
  return {
    contentComplete: boolean(item.contentComplete, "Contract completeness"),
    id: text(item.id, "Contract ID", 128),
    documentId: optionalText(item.documentId, "Document ID", 128),
    ...contract,
    reviewStatus: item.reviewStatus,
    priceHistory: list(item.priceHistory, "Price history", 200).map(price),
    lastReviewedAt: text(item.lastReviewedAt, "Last reviewed time", 40, true),
    updatedAt: text(item.updatedAt, "Contract update time", 40),
  };
}

export function parseOfficeContractsSnapshot(value: unknown): OfficeContractsSnapshot {
  const item = record(value, "Office contracts snapshot");
  exact(item, ["schemaVersion", "revision", "contracts"], "Office contracts snapshot");
  if (item.schemaVersion !== OFFICE_CONTRACTS_SCHEMA_VERSION) {
    throw new Error("Please update DiaryDock to open Office contracts.");
  }
  return {
    schemaVersion: OFFICE_CONTRACTS_SCHEMA_VERSION,
    revision: optionalText(item.revision, "Office revision", 40),
    contracts: list(item.contracts, "Office contracts", 300).map(parseOfficeContractRecord),
  };
}

export function parseOfficeContractDetailRequest(value: unknown): OfficeContractDetailRequest {
  const item = record(value, "Office contract detail request");
  exact(item, ["contractId"], "Office contract detail request");
  return { contractId: text(item.contractId, "Contract ID", 128) };
}

export function parseOfficeContractDetail(value: unknown): OfficeContractDetail {
  const item = record(value, "Office contract detail");
  exact(item, ["schemaVersion", "contract"], "Office contract detail");
  if (item.schemaVersion !== OFFICE_CONTRACT_DETAIL_SCHEMA_VERSION) {
    throw new Error("Please update DiaryDock to open this contract.");
  }
  const contract = parseOfficeContractRecord(item.contract);
  if (!contract.contentComplete) throw new Error("Office contract detail is incomplete.");
  return { schemaVersion: OFFICE_CONTRACT_DETAIL_SCHEMA_VERSION, contract };
}
