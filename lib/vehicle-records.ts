export type VehicleOwnershipStatus =
  | "unknown"
  | "owned"
  | "financed"
  | "leased"
  | "company"
  | "other";

export type VehicleServiceKind = "service" | "repair" | "inspection";

export type VehicleMotRecord = {
  id: string;
  testDate: string;
  result: "pass" | "fail";
  mileage: number | null;
  advisoryCount: number;
  notes: string;
  documentId?: string;
  createdAt: string;
};

export type VehicleRoadTaxDetails = {
  amount: number | null;
  paymentFrequency: string;
  paidDate: string;
  paymentReference: string;
  vehicleClass: string;
  documentId?: string;
};

export type VehicleMotorInsurance = {
  provider: string;
  policyNumber: string;
  status: "not-recorded" | "active" | "expired" | "cancelled";
  policyStartDate: string;
  premium: number | null;
  paymentFrequency: string;
  coverType: string;
  voluntaryExcess: number | null;
  compulsoryExcess: number | null;
  noClaimsYears: number | null;
  courtesyCar: boolean | null;
  windscreenCover: boolean | null;
  legalExpensesCover: boolean | null;
  breakdownIncluded: boolean | null;
  providerPhone: string;
  claimsPhone: string;
  notes: string;
  breakdownProvider: string;
  breakdownPolicyNumber: string;
  documentIds: string[];
  namedDrivers: VehicleInsuranceDriver[];
  claims: VehicleInsuranceClaim[];
  renewals: VehicleInsuranceRenewal[];
};

export type VehicleInsuranceDriver = {
  id: string;
  name: string;
  relationship: string;
  mainDriver: boolean;
  notes: string;
  createdAt: string;
};

export type VehicleInsuranceClaim = {
  id: string;
  incidentDate: string;
  claimType: string;
  status: "draft" | "submitted" | "in-progress" | "settled" | "closed";
  reference: string;
  description: string;
  documentIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type VehicleInsuranceRenewal = {
  id: string;
  renewalDate: string;
  provider: string;
  premium: number | null;
  outcome: "upcoming" | "renewed" | "switched" | "cancelled";
  notes: string;
  documentIds: string[];
  createdAt: string;
};

export type VehicleMileageEntry = {
  id: string;
  mileage: number;
  recordedAt: string;
  note: string;
};

export type VehicleServiceEntry = {
  id: string;
  kind: VehicleServiceKind;
  title: string;
  provider: string;
  date: string;
  mileage: number | null;
  cost: number | null;
  notes: string;
  documentIds: string[];
  paymentMethod?: string;
  workItems?: string[];
  nextServiceDate?: string;
  nextServiceMileage?: number | null;
  createdAt: string;
};

export type VehicleExpense = {
  id: string;
  category:
    | "Fuel"
    | "Service"
    | "Repair"
    | "Tax"
    | "Insurance"
    | "Breakdown"
    | "Tyres"
    | "Parking"
    | "Other";
  title: string;
  provider: string;
  amount: number;
  date: string;
  notes: string;
  mileage?: number | null;
  paymentMethod?: string;
  receiptNumber?: string;
  recurring?: boolean;
  linkedServiceId?: string;
  documentId?: string;
  createdAt: string;
};

export type VehicleNote = {
  id: string;
  kind: "general" | "emergency";
  title: string;
  content: string;
  photoDocumentIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type VehicleAuditEntry = {
  id: string;
  action: string;
  createdAt: string;
};

export type VehicleRecord = {
  id: string;
  nickname: string;
  make: string;
  model: string;
  variant: string;
  registration: string;
  vin: string;
  year: number | null;
  colour: string;
  fuelType: string;
  transmission: string;
  drivetrain: string;
  engineSize: string;
  category: string;
  seatingCapacity: number | null;
  ownershipStatus: VehicleOwnershipStatus;
  keeperName: string;
  purchaseDate: string;
  purchasePrice: number | null;
  currentValue: number | null;
  currentValueUpdatedAt: string;
  motDueDate: string;
  taxDueDate: string;
  insuranceRenewalDate: string;
  nextServiceDate: string;
  nextServiceMileage: number | null;
  breakdownRenewalDate: string;
  financeProvider: string;
  financeAgreementEndDate: string;
  warrantyProvider: string;
  warrantyEndDate: string;
  primaryPhotoDocumentId?: string;
  documentIds: string[];
  trustedPeople: string[];
  mileage: VehicleMileageEntry[];
  motHistory: VehicleMotRecord[];
  roadTax: VehicleRoadTaxDetails;
  motorInsurance: VehicleMotorInsurance;
  services: VehicleServiceEntry[];
  expenses: VehicleExpense[];
  notes: VehicleNote[];
  audit: VehicleAuditEntry[];
  createdAt: string;
  updatedAt: string;
};

export type VehiclesRecord = {
  vehicles: VehicleRecord[];
};

export const DEFAULT_VEHICLE_ID = "tesla-model-y";

export function createInitialVehiclesRecord(): VehiclesRecord {
  return { vehicles: [] };
}

function hydrateVehicle(record: VehicleRecord): VehicleRecord {
  return {
    ...record,
    nextServiceMileage: record.nextServiceMileage ?? null,
    documentIds: Array.isArray(record.documentIds) ? record.documentIds : [],
    trustedPeople: Array.isArray(record.trustedPeople)
      ? record.trustedPeople
      : [],
    mileage: Array.isArray(record.mileage) ? record.mileage : [],
    motHistory: Array.isArray(record.motHistory) ? record.motHistory : [],
    roadTax: {
      amount: record.roadTax?.amount ?? null,
      paymentFrequency: record.roadTax?.paymentFrequency ?? "",
      paidDate: record.roadTax?.paidDate ?? "",
      paymentReference: record.roadTax?.paymentReference ?? "",
      vehicleClass: record.roadTax?.vehicleClass ?? "",
      documentId: record.roadTax?.documentId,
    },
    motorInsurance: {
      provider: record.motorInsurance?.provider ?? "",
      policyNumber: record.motorInsurance?.policyNumber ?? "",
      status: record.motorInsurance?.status ?? "not-recorded",
      policyStartDate: record.motorInsurance?.policyStartDate ?? "",
      premium: record.motorInsurance?.premium ?? null,
      paymentFrequency: record.motorInsurance?.paymentFrequency ?? "",
      coverType: record.motorInsurance?.coverType ?? "",
      voluntaryExcess: record.motorInsurance?.voluntaryExcess ?? null,
      compulsoryExcess: record.motorInsurance?.compulsoryExcess ?? null,
      noClaimsYears: record.motorInsurance?.noClaimsYears ?? null,
      courtesyCar: record.motorInsurance?.courtesyCar ?? null,
      windscreenCover: record.motorInsurance?.windscreenCover ?? null,
      legalExpensesCover: record.motorInsurance?.legalExpensesCover ?? null,
      breakdownIncluded: record.motorInsurance?.breakdownIncluded ?? null,
      providerPhone: record.motorInsurance?.providerPhone ?? "",
      claimsPhone: record.motorInsurance?.claimsPhone ?? "",
      notes: record.motorInsurance?.notes ?? "",
      breakdownProvider: record.motorInsurance?.breakdownProvider ?? "",
      breakdownPolicyNumber: record.motorInsurance?.breakdownPolicyNumber ?? "",
      documentIds: Array.isArray(record.motorInsurance?.documentIds)
        ? record.motorInsurance.documentIds
        : [],
      namedDrivers: Array.isArray(record.motorInsurance?.namedDrivers)
        ? record.motorInsurance.namedDrivers
        : [],
      claims: Array.isArray(record.motorInsurance?.claims)
        ? record.motorInsurance.claims.map((claim) => ({
            ...claim,
            documentIds: Array.isArray(claim.documentIds)
              ? claim.documentIds
              : [],
          }))
        : [],
      renewals: Array.isArray(record.motorInsurance?.renewals)
        ? record.motorInsurance.renewals.map((renewal) => ({
            ...renewal,
            documentIds: Array.isArray(renewal.documentIds)
              ? renewal.documentIds
              : [],
          }))
        : [],
    },
    services: Array.isArray(record.services)
      ? record.services.map((entry) => ({
          ...entry,
          documentIds: Array.isArray(entry.documentIds)
            ? entry.documentIds
            : [],
          workItems: Array.isArray(entry.workItems) ? entry.workItems : [],
          paymentMethod: entry.paymentMethod ?? "",
          nextServiceDate: entry.nextServiceDate ?? "",
          nextServiceMileage: entry.nextServiceMileage ?? null,
        }))
      : [],
    expenses: Array.isArray(record.expenses) ? record.expenses : [],
    notes: Array.isArray(record.notes)
      ? record.notes.map((note) => ({
          ...note,
          photoDocumentIds: Array.isArray(note.photoDocumentIds)
            ? note.photoDocumentIds
            : [],
        }))
      : [],
    audit: Array.isArray(record.audit) ? record.audit : [],
  };
}

export function hydrateVehiclesRecord(
  value?: Partial<VehiclesRecord>,
): VehiclesRecord {
  const initial = createInitialVehiclesRecord();
  if (!Array.isArray(value?.vehicles) || !value.vehicles.length) return initial;
  return { vehicles: value.vehicles.map(hydrateVehicle) };
}

export function vehicleDisplayName(vehicle: VehicleRecord) {
  return (
    vehicle.nickname.trim() ||
    [vehicle.make, vehicle.model].filter(Boolean).join(" ") ||
    "Vehicle"
  );
}

export function latestMileage(vehicle: VehicleRecord) {
  return [...vehicle.mileage].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  )[0];
}
