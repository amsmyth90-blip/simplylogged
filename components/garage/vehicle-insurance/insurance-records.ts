import {
  booleanToTriState,
  insuranceAudit,
  insuranceNumber,
  triStateToBoolean,
  type emptyClaimDraft,
  type emptyDriverDraft,
  type emptyPolicyDraft,
  type emptyRenewalDraft,
} from "@/components/garage/vehicle-insurance-model";
import type {
  VehicleInsuranceClaim,
  VehicleInsuranceDriver,
  VehicleInsuranceRenewal,
  VehicleRecord,
} from "@/lib/vehicle-records";

export type PolicyDraft = typeof emptyPolicyDraft;
export type DriverDraft = typeof emptyDriverDraft;
export type ClaimDraft = typeof emptyClaimDraft;
export type RenewalDraft = typeof emptyRenewalDraft;

export function policyDraftFor(vehicle: VehicleRecord): PolicyDraft {
  const insurance = vehicle.motorInsurance;
  return {
    breakdownIncluded: booleanToTriState(insurance.breakdownIncluded),
    breakdownPolicyNumber: insurance.breakdownPolicyNumber,
    breakdownProvider: insurance.breakdownProvider,
    breakdownRenewalDate: vehicle.breakdownRenewalDate,
    claimsPhone: insurance.claimsPhone,
    compulsoryExcess: insurance.compulsoryExcess?.toString() ?? "",
    courtesyCar: booleanToTriState(insurance.courtesyCar),
    coverType: insurance.coverType,
    legalExpensesCover: booleanToTriState(insurance.legalExpensesCover),
    noClaimsYears: insurance.noClaimsYears?.toString() ?? "",
    notes: insurance.notes,
    paymentFrequency: insurance.paymentFrequency,
    policyNumber: insurance.policyNumber,
    policyStartDate: insurance.policyStartDate,
    premium: insurance.premium?.toString() ?? "",
    provider: insurance.provider,
    providerPhone: insurance.providerPhone,
    renewalDate: vehicle.insuranceRenewalDate,
    status: insurance.status,
    voluntaryExcess: insurance.voluntaryExcess?.toString() ?? "",
    windscreenCover: booleanToTriState(insurance.windscreenCover),
  };
}

export function applyPolicy(
  current: VehicleRecord,
  draft: PolicyDraft,
): VehicleRecord {
  return {
    ...current,
    audit: [insuranceAudit("Motor insurance policy updated"), ...current.audit],
    breakdownRenewalDate: draft.breakdownRenewalDate,
    insuranceRenewalDate: draft.renewalDate,
    motorInsurance: {
      ...current.motorInsurance,
      breakdownIncluded: triStateToBoolean(draft.breakdownIncluded),
      breakdownPolicyNumber: draft.breakdownPolicyNumber.trim(),
      breakdownProvider: draft.breakdownProvider.trim(),
      claimsPhone: draft.claimsPhone.trim(),
      compulsoryExcess: insuranceNumber(draft.compulsoryExcess),
      courtesyCar: triStateToBoolean(draft.courtesyCar),
      coverType: draft.coverType.trim(),
      legalExpensesCover: triStateToBoolean(draft.legalExpensesCover),
      noClaimsYears: insuranceNumber(draft.noClaimsYears),
      notes: draft.notes.trim(),
      paymentFrequency: draft.paymentFrequency.trim(),
      policyNumber: draft.policyNumber.trim(),
      policyStartDate: draft.policyStartDate,
      premium: insuranceNumber(draft.premium),
      provider: draft.provider.trim(),
      providerPhone: draft.providerPhone.trim(),
      status: draft.status,
      voluntaryExcess: insuranceNumber(draft.voluntaryExcess),
      windscreenCover: triStateToBoolean(draft.windscreenCover),
    },
    updatedAt: new Date().toISOString(),
  };
}

export function createDriver(draft: DriverDraft): VehicleInsuranceDriver {
  return {
    createdAt: new Date().toISOString(),
    id: crypto.randomUUID(),
    mainDriver: draft.mainDriver,
    name: draft.name.trim(),
    notes: draft.notes.trim(),
    relationship: draft.relationship.trim(),
  };
}

export function createClaim(draft: ClaimDraft): VehicleInsuranceClaim {
  const now = new Date().toISOString();
  return {
    claimType: draft.claimType.trim(),
    createdAt: now,
    description: draft.description.trim(),
    documentIds: draft.documentId ? [draft.documentId] : [],
    id: crypto.randomUUID(),
    incidentDate: draft.incidentDate,
    reference: draft.reference.trim(),
    status: draft.status,
    updatedAt: now,
  };
}

export function createRenewal(draft: RenewalDraft): VehicleInsuranceRenewal {
  return {
    createdAt: new Date().toISOString(),
    documentIds: draft.documentId ? [draft.documentId] : [],
    id: crypto.randomUUID(),
    notes: draft.notes.trim(),
    outcome: draft.outcome,
    premium: insuranceNumber(draft.premium),
    provider: draft.provider.trim(),
    renewalDate: draft.renewalDate,
  };
}
