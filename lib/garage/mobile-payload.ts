import {
  GARAGE_SCHEMA_VERSION,
  parseGarageSnapshot,
  type GarageExpense,
  type GarageNote,
  type GarageService,
  type GarageSnapshot,
  type GarageVehicle,
} from "@diarydock/vehicles";

import { jsonUtf8Bytes } from "../serialization/json-size.ts";

type JsonRecord = Record<string, unknown>;

const MOBILE_SNAPSHOT_LIMIT = 480 * 1024;

function object(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function string(value: unknown, maximum: number) {
  return typeof value === "string" ? value.slice(0, maximum).trim() : "";
}

function number(value: unknown, minimum = 0, maximum = 100_000_000) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
    ? value
    : null;
}

function date(value: unknown) {
  const candidate = string(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : "";
}

function latestMileage(vehicle: JsonRecord) {
  if (!Array.isArray(vehicle.mileage)) return null;
  const entries = vehicle.mileage
    .map((entry, index) => {
      const item = object(entry);
      return {
        index,
        mileage: number(item.mileage, 0, 10_000_000),
        recordedAt: Date.parse(string(item.recordedAt, 40)),
      };
    })
    .filter(
      (entry): entry is typeof entry & { mileage: number } =>
        entry.mileage !== null,
    )
    .sort((left, right) => {
      const leftTime = Number.isFinite(left.recordedAt)
        ? left.recordedAt
        : -left.index;
      const rightTime = Number.isFinite(right.recordedAt)
        ? right.recordedAt
        : -right.index;
      return rightTime - leftTime;
    });
  return entries[0]?.mileage ?? null;
}

function service(value: unknown): GarageService | null {
  const item = object(value);
  const id = string(item.id, 128);
  const kind = item.kind;
  const title = string(item.title, 160);
  const serviceDate = date(item.date);
  if (
    !id ||
    !title ||
    !serviceDate ||
    (kind !== "service" && kind !== "repair" && kind !== "inspection")
  ) {
    return null;
  }
  return {
    id,
    kind,
    title,
    provider: string(item.provider, 160),
    date: serviceDate,
    mileage: number(item.mileage, 0, 10_000_000),
    cost: number(item.cost),
    notes: string(item.notes, 2_000),
  };
}

function expense(value: unknown): GarageExpense | null {
  const item = object(value);
  const id = string(item.id, 128);
  const allowed = [
    "Fuel",
    "Service",
    "Repair",
    "Tax",
    "Insurance",
    "Breakdown",
    "Tyres",
    "Parking",
    "Other",
  ];
  const category = allowed.includes(String(item.category))
    ? (item.category as GarageExpense["category"])
    : "Other";
  const title = string(item.title, 160);
  const expenseDate = date(item.date);
  const amount = number(item.amount);
  if (!id || !title || !expenseDate || amount === null) return null;
  return {
    id,
    category,
    title,
    provider: string(item.provider, 160),
    amount,
    date: expenseDate,
    notes: string(item.notes, 2_000),
  };
}

function note(value: unknown): GarageNote | null {
  const item = object(value);
  const id = string(item.id, 128);
  const title = string(item.title, 160);
  const content = string(item.content, 4_000);
  if (!id || !title || !content) return null;
  return {
    id,
    title,
    content,
    updatedAt: string(item.updatedAt, 40) || new Date(0).toISOString(),
  };
}

function fitHistories(vehicles: GarageVehicle[], revision: string | null) {
  const fitted = vehicles.map((item) => ({
    ...item,
    services: [],
    expenses: [],
    notes: [],
  }));
  let size = jsonUtf8Bytes({
    schemaVersion: GARAGE_SCHEMA_VERSION,
    revision,
    vehicles: fitted,
  });
  let round = 0;
  let added = true;
  while (added) {
    added = false;
    for (let index = 0; index < vehicles.length; index += 1) {
      const source = vehicles[index]!;
      const target = fitted[index]!;
      const candidates = [
        [source.services[round], target.services],
        [source.expenses[round], target.expenses],
        [source.notes[round], target.notes],
      ] as const;
      for (const [entry, collection] of candidates) {
        if (!entry) continue;
        const entrySize = jsonUtf8Bytes(entry) + 1;
        if (size + entrySize > MOBILE_SNAPSHOT_LIMIT) continue;
        collection.push(entry as never);
        size += entrySize;
        added = true;
      }
    }
    round += 1;
  }
  return fitted;
}

function vehicle(value: unknown): GarageVehicle | null {
  const item = object(value);
  const id = string(item.id, 128);
  const nickname = string(item.nickname, 160);
  const make = string(item.make, 100);
  const model = string(item.model, 100);
  if (!id) return null;
  const services = (Array.isArray(item.services) ? item.services : [])
    .slice(0, 200)
    .map(service)
    .filter((entry): entry is GarageService => Boolean(entry));
  const expenses = (Array.isArray(item.expenses) ? item.expenses : [])
    .slice(0, 500)
    .map(expense)
    .filter((entry): entry is GarageExpense => Boolean(entry));
  const notes = (Array.isArray(item.notes) ? item.notes : [])
    .slice(0, 200)
    .map(note)
    .filter((entry): entry is GarageNote => Boolean(entry));
  return {
    id,
    displayName:
      nickname || [make, model].filter(Boolean).join(" ") || "Vehicle",
    make,
    model,
    registration: string(item.registration, 32),
    year: number(item.year, 1886, 2200),
    mileage: latestMileage(item),
    motDueDate: date(item.motDueDate),
    taxDueDate: date(item.taxDueDate),
    insuranceRenewalDate: date(item.insuranceRenewalDate),
    nextServiceDate: date(item.nextServiceDate),
    breakdownRenewalDate: date(item.breakdownRenewalDate),
    documentCount: Array.isArray(item.documentIds)
      ? Math.min(item.documentIds.length, 10_000)
      : 0,
    totalSpend: expenses.reduce((sum, entry) => sum + entry.amount, 0),
    services,
    expenses,
    notes,
  };
}

export function projectGarageSnapshot(
  payload: unknown,
  revision: string | null,
): GarageSnapshot {
  const root = object(payload);
  const vehiclesRecord = object(root.vehicles);
  const vehicles = (
    Array.isArray(vehiclesRecord.vehicles) ? vehiclesRecord.vehicles : []
  )
    .slice(0, 50)
    .map(vehicle)
    .filter((entry): entry is GarageVehicle => Boolean(entry));
  return parseGarageSnapshot({
    schemaVersion: GARAGE_SCHEMA_VERSION,
    revision,
    vehicles: fitHistories(vehicles, revision),
  });
}

export { mutateGaragePayload } from "./mobile-mutation.ts";
