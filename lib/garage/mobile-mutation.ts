import type { GarageMutation } from "@diarydock/vehicles";

import {
  createVehicleRecord,
  MAX_GARAGE_VEHICLES,
} from "../vehicle-records.ts";

type JsonRecord = Record<string, unknown>;
type MutationResult =
  | { status: "OK"; payload: JsonRecord }
  | { status: "CAPACITY" | "NOT_FOUND"; payload: null };

function object(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

export function mutateGaragePayload(
  current: unknown,
  mutation: GarageMutation,
  createId: () => string = () => crypto.randomUUID(),
): MutationResult {
  const payload = structuredClone(object(current));
  const vehiclesRecord = object(payload.vehicles);
  const vehicles = Array.isArray(vehiclesRecord.vehicles)
    ? [...vehiclesRecord.vehicles]
    : [];
  const index = vehicles.findIndex(
    (entry) => object(entry).id === mutation.vehicleId,
  );
  const now = new Date().toISOString();
  if (mutation.operation === "ADD_VEHICLE") {
    if (index >= 0) return { status: "OK", payload };
    if (vehicles.length >= MAX_GARAGE_VEHICLES) {
      return { status: "CAPACITY", payload: null };
    }
    payload.vehicles = {
      ...vehiclesRecord,
      vehicles: [createVehicleRecord(mutation, now, createId), ...vehicles],
    };
    return { status: "OK", payload };
  }
  if (index < 0) return { status: "NOT_FOUND", payload: null };
  const currentVehicle = object(vehicles[index]);

  if (mutation.operation === "ADD_EXPENSE") {
    const entries = Array.isArray(currentVehicle.expenses)
      ? [...currentVehicle.expenses]
      : [];
    if (entries.length >= 500) return { status: "CAPACITY", payload: null };
    currentVehicle.expenses = [
      {
        id: `expense-${createId()}`,
        category: mutation.category,
        title: mutation.title,
        provider: mutation.provider,
        amount: mutation.amount,
        date: mutation.date,
        notes: mutation.notes,
        createdAt: now,
      },
      ...entries,
    ];
  } else if (mutation.operation === "ADD_SERVICE") {
    const entries = Array.isArray(currentVehicle.services)
      ? [...currentVehicle.services]
      : [];
    if (entries.length >= 200) return { status: "CAPACITY", payload: null };
    currentVehicle.services = [
      {
        id: `service-${createId()}`,
        kind: mutation.kind,
        title: mutation.title,
        provider: mutation.provider,
        date: mutation.date,
        mileage: mutation.mileage,
        cost: mutation.cost,
        notes: mutation.notes,
        documentIds: [],
        createdAt: now,
      },
      ...entries,
    ];
  } else if (mutation.operation === "ADD_MILEAGE") {
    const entries = Array.isArray(currentVehicle.mileage)
      ? [...currentVehicle.mileage]
      : [];
    if (entries.length >= 1_000) return { status: "CAPACITY", payload: null };
    currentVehicle.mileage = [
      {
        id: `mileage-${createId()}`,
        mileage: mutation.mileage,
        recordedAt: mutation.recordedAt,
        note: mutation.note,
      },
      ...entries,
    ];
  } else {
    const entries = Array.isArray(currentVehicle.notes)
      ? [...currentVehicle.notes]
      : [];
    if (entries.length >= 200) return { status: "CAPACITY", payload: null };
    currentVehicle.notes = [
      {
        id: `note-${createId()}`,
        kind: "general",
        title: mutation.title,
        content: mutation.content,
        photoDocumentIds: [],
        createdAt: now,
        updatedAt: now,
      },
      ...entries,
    ];
  }
  currentVehicle.updatedAt = now;
  vehicles[index] = currentVehicle;
  payload.vehicles = { ...vehiclesRecord, vehicles };
  return { status: "OK", payload };
}
