import {
  OFFICE_INSURANCE_DETAIL_SCHEMA_VERSION,
  OFFICE_INSURANCE_SCHEMA_VERSION,
  officeClaimStatuses,
  officeInsuranceTypes,
  officePolicyStatuses,
  officePremiumFrequencies,
  parseOfficeInsuranceDetail,
  parseOfficeInsuranceSnapshot,
  type OfficeInsuranceClaim,
  type OfficeInsurancePolicy,
  type OfficeInsuranceSnapshot,
  type OfficePolicyCoverItem,
  type OfficePolicyHistory,
} from "@diarydock/office";

import { jsonUtf8Bytes } from "../serialization/json-size.ts";

type JsonRecord = Record<string, unknown>;
const SNAPSHOT_LIMIT = 480 * 1024;

function object(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function text(value: unknown, maximum: number) {
  return typeof value === "string" ? value.slice(0, maximum).trim() : "";
}

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    && value <= 100_000_000 ? value : 0;
}

function date(value: unknown) {
  const candidate = text(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : "";
}

function strings(value: unknown, maximum: number) {
  return (Array.isArray(value) ? value : []).slice(0, maximum)
    .map((item) => text(item, 160)).filter(Boolean);
}

function coverItem(value: unknown): OfficePolicyCoverItem | null {
  const item = object(value);
  const id = text(item.id, 128);
  const label = text(item.label, 160);
  if (!id || !label) return null;
  return { id, label, value: text(item.value, 240), included: item.included === true };
}

function history(value: unknown): OfficePolicyHistory | null {
  const item = object(value);
  const id = text(item.id, 128);
  if (!id) return null;
  return {
    id,
    premium: number(item.premium),
    excess: number(item.excess),
    renewalDate: date(item.renewalDate),
    recordedAt: text(item.recordedAt, 40) || new Date(0).toISOString(),
  };
}

export function projectOfficePolicy(value: unknown): OfficeInsurancePolicy | null {
  const item = object(value);
  const id = text(item.id, 128);
  const title = text(item.title, 160);
  const provider = text(item.provider, 160);
  if (!id || (!title && !provider)) return null;
  return {
    contentComplete: true,
    id,
    documentId: text(item.documentId, 128) || null,
    title: title || `${provider} policy`,
    type: officeInsuranceTypes.includes(item.type as never)
      ? item.type as OfficeInsurancePolicy["type"] : "Other personal",
    provider,
    policyNumberMasked: text(item.policyNumberMasked, 80),
    status: officePolicyStatuses.includes(item.status as never)
      ? item.status as OfficeInsurancePolicy["status"] : "draft",
    reviewStatus: item.reviewStatus === "reviewed" ? "reviewed" : "needs-review",
    startDate: date(item.startDate),
    renewalDate: date(item.renewalDate),
    premium: number(item.premium),
    premiumFrequency: officePremiumFrequencies.includes(item.premiumFrequency as never)
      ? item.premiumFrequency as OfficeInsurancePolicy["premiumFrequency"] : "annual",
    autoRenew: item.autoRenew === true,
    coverSummary: text(item.coverSummary, 4_000),
    coverItems: (Array.isArray(item.coverItems) ? item.coverItems : []).slice(0, 50)
      .map(coverItem).filter((entry): entry is OfficePolicyCoverItem => Boolean(entry)),
    excess: number(item.excess),
    providerPhone: text(item.providerPhone, 80),
    providerEmail: text(item.providerEmail, 254),
    linkedPeople: strings(item.linkedPeople, 50),
    linkedAsset: text(item.linkedAsset, 240),
    beneficiaries: text(item.beneficiaries, 2_000),
    notes: text(item.notes, 4_000),
    history: (Array.isArray(item.history) ? item.history : []).slice(-100)
      .map(history).filter((entry): entry is OfficePolicyHistory => Boolean(entry)),
    createdAt: text(item.createdAt, 40) || new Date(0).toISOString(),
    updatedAt: text(item.updatedAt, 40) || new Date(0).toISOString(),
  };
}

export function projectOfficeClaim(value: unknown): OfficeInsuranceClaim | null {
  const item = object(value);
  const id = text(item.id, 128);
  const policyId = text(item.policyId, 128);
  const title = text(item.title, 160);
  if (!id || !policyId || !title) return null;
  return {
    contentComplete: true,
    id,
    policyId,
    title,
    claimNumberMasked: text(item.claimNumberMasked, 80),
    incidentDate: date(item.incidentDate),
    status: officeClaimStatuses.includes(item.status as never)
      ? item.status as OfficeInsuranceClaim["status"] : "draft",
    description: text(item.description, 4_000),
    evidenceDocumentIds: strings(item.evidenceDocumentIds, 50),
    createdAt: text(item.createdAt, 40) || new Date(0).toISOString(),
    updatedAt: text(item.updatedAt, 40) || new Date(0).toISOString(),
  };
}

function fitSnapshot(
  policies: OfficeInsurancePolicy[],
  claims: OfficeInsuranceClaim[],
  revision: string | null,
) {
  const complete = { schemaVersion: OFFICE_INSURANCE_SCHEMA_VERSION, revision, policies, claims };
  if (jsonUtf8Bytes(complete) <= SNAPSHOT_LIMIT) return complete;
  const fitted = {
    schemaVersion: OFFICE_INSURANCE_SCHEMA_VERSION,
    revision,
    policies: policies.map((item) => ({ ...item, contentComplete: false,
      coverSummary: "", coverItems: [], linkedPeople: [], beneficiaries: "",
      notes: "", history: [] })),
    claims: claims.map((item) => ({ ...item, contentComplete: false,
      description: "", evidenceDocumentIds: [] })),
  };
  if (jsonUtf8Bytes(fitted) > SNAPSHOT_LIMIT) {
    throw new Error("Office insurance exceeds the safe mobile record limit.");
  }
  return fitted;
}

export function projectOfficeInsuranceSnapshot(
  payload: unknown,
  revision: string | null,
): OfficeInsuranceSnapshot {
  const insurance = object(object(payload).insurance);
  const policies = (Array.isArray(insurance.policies) ? insurance.policies : [])
    .slice(0, 200).map(projectOfficePolicy)
    .filter((entry): entry is OfficeInsurancePolicy => Boolean(entry));
  const claims = (Array.isArray(insurance.claims) ? insurance.claims : [])
    .slice(0, 200).map(projectOfficeClaim)
    .filter((entry): entry is OfficeInsuranceClaim => Boolean(entry));
  return parseOfficeInsuranceSnapshot(fitSnapshot(policies, claims, revision));
}

export function projectOfficeInsuranceDetail(payload: unknown,
  resourceType: "POLICY" | "CLAIM", resourceId: string) {
  const insurance = object(object(payload).insurance);
  if (resourceType === "POLICY") {
    const value = (Array.isArray(insurance.policies) ? insurance.policies : [])
      .slice(0, 200).find((entry) => text(object(entry).id, 128) === resourceId);
    const projected = projectOfficePolicy(value);
    return projected ? parseOfficeInsuranceDetail({
      schemaVersion: OFFICE_INSURANCE_DETAIL_SCHEMA_VERSION,
      resourceType, policy: projected,
    }) : null;
  }
  const value = (Array.isArray(insurance.claims) ? insurance.claims : [])
    .slice(0, 200).find((entry) => text(object(entry).id, 128) === resourceId);
  const projected = projectOfficeClaim(value);
  return projected ? parseOfficeInsuranceDetail({
    schemaVersion: OFFICE_INSURANCE_DETAIL_SCHEMA_VERSION,
    resourceType, claim: projected,
  }) : null;
}

export { mutateOfficeInsurancePayload } from "./mobile-insurance-mutation.ts";
