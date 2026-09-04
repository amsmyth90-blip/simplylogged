import type { GarageMutation } from "@diarydock/vehicles";

import type { VehicleRecord, VehiclesRecord } from "./vehicle-record-types.ts";

export * from "./vehicle-record-types.ts";

export const MAX_GARAGE_VEHICLES = 50;

type NewVehicleDetails = Omit<
  Extract<GarageMutation, { operation: "ADD_VEHICLE" }>,
  "operation" | "revision"
>;

export function createVehicleRecord(
  details: NewVehicleDetails,
  now = new Date().toISOString(),
  createId: () => string = () => crypto.randomUUID(),
): VehicleRecord {
  return {
    id: details.vehicleId,
    nickname: details.nickname,
    make: details.make,
    model: details.model,
    variant: "",
    registration: details.registration,
    vin: "",
    year: details.year,
    colour: "",
    fuelType: "",
    transmission: "",
    drivetrain: "",
    engineSize: "",
    category: "",
    seatingCapacity: null,
    ownershipStatus: "unknown",
    keeperName: "",
    purchaseDate: "",
    purchasePrice: null,
    currentValue: null,
    currentValueUpdatedAt: "",
    motDueDate: "",
    taxDueDate: "",
    insuranceRenewalDate: "",
    nextServiceDate: "",
    nextServiceMileage: null,
    breakdownRenewalDate: "",
    financeProvider: "",
    financeAgreementEndDate: "",
    warrantyProvider: "",
    warrantyEndDate: "",
    documentIds: [],
    trustedPeople: [],
    mileage: [],
    motHistory: [],
    roadTax: {
      amount: null,
      paymentFrequency: "",
      paidDate: "",
      paymentReference: "",
      vehicleClass: "",
    },
    motorInsurance: {
      provider: "",
      policyNumber: "",
      status: "not-recorded",
      policyStartDate: "",
      premium: null,
      paymentFrequency: "",
      coverType: "",
      voluntaryExcess: null,
      compulsoryExcess: null,
      noClaimsYears: null,
      courtesyCar: null,
      windscreenCover: null,
      legalExpensesCover: null,
      breakdownIncluded: null,
      providerPhone: "",
      claimsPhone: "",
      notes: "",
      breakdownProvider: "",
      breakdownPolicyNumber: "",
      documentIds: [],
      namedDrivers: [],
      claims: [],
      renewals: [],
    },
    services: [],
    expenses: [],
    notes: [],
    audit: [
      { id: `audit-${createId()}`, action: "Vehicle created", createdAt: now },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

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
