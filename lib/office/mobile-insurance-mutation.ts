import type {
  OfficeInsuranceMutation,
  SaveOfficeInsurancePolicy,
} from "@diarydock/office";

type JsonRecord = Record<string, unknown>;
type MutationResult =
  | { status: "OK"; payload: JsonRecord; document: JsonRecord | null }
  | { status: "CAPACITY" | "INVALID_REFERENCE" | "NOT_FOUND"; payload: null; document: null };

function object(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function policyHistory(current: JsonRecord, policy: SaveOfficeInsurancePolicy, now: string) {
  const history = Array.isArray(current.history) ? [...current.history] : [];
  const changed = current.reviewStatus === "reviewed"
    && (current.premium !== policy.premium || current.excess !== policy.excess
      || current.renewalDate !== policy.renewalDate);
  if (!changed && history.length) return history;
  return [...history.slice(-99), {
    id: crypto.randomUUID(),
    premium: policy.premium,
    excess: policy.excess,
    renewalDate: policy.renewalDate,
    recordedAt: now,
  }];
}

function savePolicy(
  insurance: JsonRecord,
  mutation: Extract<OfficeInsuranceMutation, { operation: "SAVE_POLICY" }>,
  createId: () => string,
  now: string,
): MutationResult {
  const policies = Array.isArray(insurance.policies) ? [...insurance.policies] : [];
  if (!mutation.policyId && policies.length >= 200) {
    return { status: "CAPACITY", payload: null, document: null };
  }
  const index = mutation.policyId
    ? policies.findIndex((entry) => object(entry).id === mutation.policyId) : -1;
  if (mutation.policyId && index < 0) {
    return { status: "NOT_FOUND", payload: null, document: null };
  }
  const previous = index >= 0 ? object(policies[index]) : {};
  const id = mutation.policyId ?? createId();
  const title = mutation.policy.title || `${mutation.policy.provider} policy`;
  const next = {
    ...previous,
    ...mutation.policy,
    id,
    title,
    status: mutation.policy.status === "draft" ? "active" : mutation.policy.status,
    reviewStatus: "reviewed",
    history: policyHistory(previous, mutation.policy, now),
    createdAt: previous.createdAt ?? now,
    updatedAt: now,
  };
  if (index >= 0) policies[index] = next;
  else policies.unshift(next);
  insurance.policies = policies;
  const documentId = typeof previous.documentId === "string" ? previous.documentId : null;
  return {
    status: "OK",
    payload: insurance,
    document: documentId ? {
      id: documentId,
      title,
      provider: mutation.policy.provider,
      dueDate: mutation.policy.renewalDate,
    } : null,
  };
}

function saveClaim(
  insurance: JsonRecord,
  mutation: Extract<OfficeInsuranceMutation, { operation: "SAVE_CLAIM" }>,
  createId: () => string,
  now: string,
): MutationResult {
  const policies = Array.isArray(insurance.policies) ? insurance.policies : [];
  if (!policies.some((entry) => object(entry).id === mutation.claim.policyId)) {
    return { status: "INVALID_REFERENCE", payload: null, document: null };
  }
  const claims = Array.isArray(insurance.claims) ? [...insurance.claims] : [];
  if (!mutation.claimId && claims.length >= 200) {
    return { status: "CAPACITY", payload: null, document: null };
  }
  const index = mutation.claimId
    ? claims.findIndex((entry) => object(entry).id === mutation.claimId) : -1;
  if (mutation.claimId && index < 0) {
    return { status: "NOT_FOUND", payload: null, document: null };
  }
  const previous = index >= 0 ? object(claims[index]) : {};
  const next = {
    ...previous,
    ...mutation.claim,
    id: mutation.claimId ?? createId(),
    evidenceDocumentIds: Array.isArray(previous.evidenceDocumentIds)
      ? previous.evidenceDocumentIds : [],
    createdAt: previous.createdAt ?? now,
    updatedAt: now,
  };
  if (index >= 0) claims[index] = next;
  else claims.unshift(next);
  insurance.claims = claims;
  return { status: "OK", payload: insurance, document: null };
}

export function mutateOfficeInsurancePayload(
  current: unknown,
  mutation: OfficeInsuranceMutation,
  createId: () => string = () => crypto.randomUUID(),
  now = new Date().toISOString(),
): MutationResult {
  const payload = structuredClone(object(current));
  const insurance = object(payload.insurance);
  const result = mutation.operation === "SAVE_POLICY"
    ? savePolicy(insurance, mutation, createId, now)
    : saveClaim(insurance, mutation, createId, now);
  if (result.status !== "OK") return result;
  payload.insurance = result.payload;
  return { status: "OK", payload, document: result.document };
}
