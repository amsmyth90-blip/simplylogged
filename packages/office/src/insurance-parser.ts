import {
  OFFICE_INSURANCE_DETAIL_SCHEMA_VERSION,
  OFFICE_INSURANCE_SCHEMA_VERSION,
  officeClaimStatuses,
  officeInsuranceTypes,
  officePolicyStatuses,
  officePremiumFrequencies,
  type OfficeClaimStatus,
  type OfficeInsuranceClaim,
  type OfficeInsuranceDetail,
  type OfficeInsuranceDetailRequest,
  type OfficeInsurancePolicy,
  type OfficeInsuranceSnapshot,
  type OfficeInsuranceType,
  type OfficePolicyCoverItem,
  type OfficePolicyHistory,
  type OfficePolicyStatus,
  type OfficePremiumFrequency,
  type SaveOfficeInsuranceClaim,
  type SaveOfficeInsurancePolicy,
} from "./insurance-types.ts";
import { boolean, date, exact, finiteNumber, list, optionalText, record, text } from "./validation.ts";

function member<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (!allowed.includes(value as T)) throw new Error(`${label} is invalid.`);
  return value as T;
}

function stringList(value: unknown, label: string, maximum: number) {
  return list(value, label, maximum).map((item) => text(item, label, 160));
}

function coverItem(value: unknown): OfficePolicyCoverItem {
  const item = record(value, "Cover item");
  exact(item, ["id", "label", "value", "included"], "Cover item");
  return {
    id: text(item.id, "Cover item ID", 128),
    label: text(item.label, "Cover item label", 160),
    value: text(item.value, "Cover item value", 240, true),
    included: boolean(item.included, "Cover item choice"),
  };
}

function history(value: unknown): OfficePolicyHistory {
  const item = record(value, "Policy history");
  exact(item, ["id", "premium", "excess", "renewalDate", "recordedAt"], "Policy history");
  return {
    id: text(item.id, "History ID", 128),
    premium: finiteNumber(item.premium, "History premium", 0, 100_000_000),
    excess: finiteNumber(item.excess, "History excess", 0, 100_000_000),
    renewalDate: date(item.renewalDate, "History renewal date"),
    recordedAt: text(item.recordedAt, "History time", 40),
  };
}

export function parseSaveOfficePolicy(value: unknown): SaveOfficeInsurancePolicy {
  const item = record(value, "Insurance policy");
  exact(item, ["title", "type", "provider", "policyNumberMasked", "status", "startDate",
    "renewalDate", "premium", "premiumFrequency", "autoRenew", "coverSummary",
    "coverItems", "excess", "providerPhone", "providerEmail", "linkedPeople",
    "linkedAsset", "beneficiaries", "notes"], "Insurance policy");
  const title = text(item.title, "Policy title", 160, true);
  const provider = text(item.provider, "Policy provider", 160, true);
  if (!title && !provider) throw new Error("Add a policy title or provider.");
  return {
    title,
    type: member(item.type, officeInsuranceTypes, "Policy type") as OfficeInsuranceType,
    provider,
    policyNumberMasked: text(item.policyNumberMasked, "Masked policy number", 80, true),
    status: member(item.status, officePolicyStatuses, "Policy status") as OfficePolicyStatus,
    startDate: date(item.startDate, "Policy start date"),
    renewalDate: date(item.renewalDate, "Policy renewal date"),
    premium: finiteNumber(item.premium, "Policy premium", 0, 100_000_000),
    premiumFrequency: member(item.premiumFrequency, officePremiumFrequencies, "Premium frequency") as OfficePremiumFrequency,
    autoRenew: boolean(item.autoRenew, "Automatic renewal choice"),
    coverSummary: text(item.coverSummary, "Cover summary", 4_000, true),
    coverItems: list(item.coverItems, "Cover items", 50).map(coverItem),
    excess: finiteNumber(item.excess, "Policy excess", 0, 100_000_000),
    providerPhone: text(item.providerPhone, "Provider phone", 80, true),
    providerEmail: text(item.providerEmail, "Provider email", 254, true),
    linkedPeople: stringList(item.linkedPeople, "Linked people", 50),
    linkedAsset: text(item.linkedAsset, "Linked asset", 240, true),
    beneficiaries: text(item.beneficiaries, "Beneficiary note", 2_000, true),
    notes: text(item.notes, "Policy notes", 4_000, true),
  };
}

export function parseOfficePolicyRecord(value: unknown): OfficeInsurancePolicy {
  const item = record(value, "Policy record");
  exact(item, ["contentComplete", "id", "documentId", "title", "type", "provider", "policyNumberMasked",
    "status", "reviewStatus", "startDate", "renewalDate", "premium", "premiumFrequency",
    "autoRenew", "coverSummary", "coverItems", "excess", "providerPhone", "providerEmail",
    "linkedPeople", "linkedAsset", "beneficiaries", "notes", "history", "createdAt", "updatedAt"], "Policy record");
  const fields = parseSaveOfficePolicy(Object.fromEntries(Object.entries(item).filter(([key]) =>
    !["contentComplete", "id", "documentId", "reviewStatus", "history", "createdAt", "updatedAt"].includes(key))));
  if (item.reviewStatus !== "needs-review" && item.reviewStatus !== "reviewed") {
    throw new Error("Policy review status is invalid.");
  }
  return {
    contentComplete: boolean(item.contentComplete, "Policy completeness"),
    id: text(item.id, "Policy ID", 128),
    documentId: optionalText(item.documentId, "Policy document ID", 128),
    ...fields,
    reviewStatus: item.reviewStatus,
    history: list(item.history, "Policy history", 100).map(history),
    createdAt: text(item.createdAt, "Policy creation time", 40),
    updatedAt: text(item.updatedAt, "Policy update time", 40),
  };
}

export function parseSaveOfficeClaim(value: unknown): SaveOfficeInsuranceClaim {
  const item = record(value, "Insurance claim");
  exact(item, ["policyId", "title", "claimNumberMasked", "incidentDate", "status", "description"], "Insurance claim");
  return {
    policyId: text(item.policyId, "Claim policy ID", 128),
    title: text(item.title, "Claim title", 160),
    claimNumberMasked: text(item.claimNumberMasked, "Masked claim number", 80, true),
    incidentDate: date(item.incidentDate, "Incident date"),
    status: member(item.status, officeClaimStatuses, "Claim status") as OfficeClaimStatus,
    description: text(item.description, "Claim description", 4_000, true),
  };
}

export function parseOfficeClaimRecord(value: unknown): OfficeInsuranceClaim {
  const item = record(value, "Claim record");
  exact(item, ["contentComplete", "id", "policyId", "title", "claimNumberMasked", "incidentDate", "status",
    "description", "evidenceDocumentIds", "createdAt", "updatedAt"], "Claim record");
  return {
    contentComplete: boolean(item.contentComplete, "Claim completeness"),
    id: text(item.id, "Claim ID", 128),
    ...parseSaveOfficeClaim({
      policyId: item.policyId,
      title: item.title,
      claimNumberMasked: item.claimNumberMasked,
      incidentDate: item.incidentDate,
      status: item.status,
      description: item.description,
    }),
    evidenceDocumentIds: stringList(item.evidenceDocumentIds, "Claim evidence", 50),
    createdAt: text(item.createdAt, "Claim creation time", 40),
    updatedAt: text(item.updatedAt, "Claim update time", 40),
  };
}

export function parseOfficeInsuranceSnapshot(value: unknown): OfficeInsuranceSnapshot {
  const item = record(value, "Office insurance snapshot");
  exact(item, ["schemaVersion", "revision", "policies", "claims"], "Office insurance snapshot");
  if (item.schemaVersion !== OFFICE_INSURANCE_SCHEMA_VERSION) {
    throw new Error("Please update DiaryDock to open Office insurance.");
  }
  return {
    schemaVersion: OFFICE_INSURANCE_SCHEMA_VERSION,
    revision: optionalText(item.revision, "Office revision", 40),
    policies: list(item.policies, "Insurance policies", 200).map(parseOfficePolicyRecord),
    claims: list(item.claims, "Insurance claims", 200).map(parseOfficeClaimRecord),
  };
}

export function parseOfficeInsuranceDetailRequest(value: unknown): OfficeInsuranceDetailRequest {
  const item = record(value, "Office insurance detail request");
  exact(item, ["resourceType", "resourceId"], "Office insurance detail request");
  if (item.resourceType !== "POLICY" && item.resourceType !== "CLAIM") {
    throw new Error("Insurance resource type is invalid.");
  }
  return { resourceType: item.resourceType,
    resourceId: text(item.resourceId, "Insurance resource ID", 128) };
}

export function parseOfficeInsuranceDetail(value: unknown): OfficeInsuranceDetail {
  const item = record(value, "Office insurance detail");
  if (item.schemaVersion !== OFFICE_INSURANCE_DETAIL_SCHEMA_VERSION) {
    throw new Error("Please update DiaryDock to open this insurance record.");
  }
  if (item.resourceType === "POLICY") {
    exact(item, ["schemaVersion", "resourceType", "policy"], "Office insurance detail");
    const policy = parseOfficePolicyRecord(item.policy);
    if (!policy.contentComplete) throw new Error("Office policy detail is incomplete.");
    return { schemaVersion: OFFICE_INSURANCE_DETAIL_SCHEMA_VERSION,
      resourceType: "POLICY", policy };
  }
  if (item.resourceType === "CLAIM") {
    exact(item, ["schemaVersion", "resourceType", "claim"], "Office insurance detail");
    const claim = parseOfficeClaimRecord(item.claim);
    if (!claim.contentComplete) throw new Error("Office claim detail is incomplete.");
    return { schemaVersion: OFFICE_INSURANCE_DETAIL_SCHEMA_VERSION,
      resourceType: "CLAIM", claim };
  }
  throw new Error("Insurance resource type is invalid.");
}
