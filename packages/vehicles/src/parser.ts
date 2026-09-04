import {
  GARAGE_SCHEMA_VERSION,
  garageExpenseCategories,
  type GarageExpense,
  type GarageExpenseCategory,
  type GarageNote,
  type GarageService,
  type GarageSnapshot,
  type GarageVehicle,
} from "./types.ts";
import {
  date,
  exact,
  finiteNumber,
  list,
  nullableNumber,
  nullableRevision,
  record,
  text,
} from "./validation.ts";

export function parseExpenseCategory(value: unknown): GarageExpenseCategory {
  if (!garageExpenseCategories.includes(value as GarageExpenseCategory)) {
    throw new Error("Expense category is invalid.");
  }
  return value as GarageExpenseCategory;
}

function service(value: unknown): GarageService {
  const item = record(value, "Service record");
  exact(
    item,
    ["id", "kind", "title", "provider", "date", "mileage", "cost", "notes"],
    "Service record",
  );
  if (
    item.kind !== "service" &&
    item.kind !== "repair" &&
    item.kind !== "inspection"
  ) {
    throw new Error("Service type is invalid.");
  }
  return {
    id: text(item.id, "Service ID", 128),
    kind: item.kind,
    title: text(item.title, "Service title", 160),
    provider: text(item.provider, "Service provider", 160, true),
    date: date(item.date, "Service date"),
    mileage: nullableNumber(item.mileage, "Service mileage", 0, 10_000_000),
    cost: nullableNumber(item.cost, "Service cost", 0, 10_000_000),
    notes: text(item.notes, "Service notes", 2_000, true),
  };
}

function expense(value: unknown): GarageExpense {
  const item = record(value, "Expense");
  exact(
    item,
    ["id", "category", "title", "provider", "amount", "date", "notes"],
    "Expense",
  );
  return {
    id: text(item.id, "Expense ID", 128),
    category: parseExpenseCategory(item.category),
    title: text(item.title, "Expense title", 160),
    provider: text(item.provider, "Expense provider", 160, true),
    amount: finiteNumber(item.amount, "Expense amount", 0, 10_000_000),
    date: date(item.date, "Expense date"),
    notes: text(item.notes, "Expense notes", 2_000, true),
  };
}

function note(value: unknown): GarageNote {
  const item = record(value, "Vehicle note");
  exact(item, ["id", "title", "content", "updatedAt"], "Vehicle note");
  return {
    id: text(item.id, "Vehicle note ID", 128),
    title: text(item.title, "Vehicle note title", 160),
    content: text(item.content, "Vehicle note", 4_000),
    updatedAt: text(item.updatedAt, "Vehicle note update time", 40),
  };
}

function vehicle(value: unknown): GarageVehicle {
  const item = record(value, "Vehicle");
  exact(
    item,
    [
      "id",
      "displayName",
      "make",
      "model",
      "registration",
      "year",
      "mileage",
      "motDueDate",
      "taxDueDate",
      "insuranceRenewalDate",
      "nextServiceDate",
      "breakdownRenewalDate",
      "documentCount",
      "totalSpend",
      "services",
      "expenses",
      "notes",
    ],
    "Vehicle",
  );
  return {
    id: text(item.id, "Vehicle ID", 128),
    displayName: text(item.displayName, "Vehicle name", 160),
    make: text(item.make, "Vehicle make", 100, true),
    model: text(item.model, "Vehicle model", 100, true),
    registration: text(item.registration, "Registration", 32, true),
    year: nullableNumber(item.year, "Vehicle year", 1886, 2200),
    mileage: nullableNumber(item.mileage, "Vehicle mileage", 0, 10_000_000),
    motDueDate: date(item.motDueDate, "MOT date", true),
    taxDueDate: date(item.taxDueDate, "Tax date", true),
    insuranceRenewalDate: date(
      item.insuranceRenewalDate,
      "Insurance date",
      true,
    ),
    nextServiceDate: date(item.nextServiceDate, "Service date", true),
    breakdownRenewalDate: date(
      item.breakdownRenewalDate,
      "Breakdown date",
      true,
    ),
    documentCount: finiteNumber(
      item.documentCount,
      "Document count",
      0,
      10_000,
    ),
    totalSpend: finiteNumber(item.totalSpend, "Total spend", 0, 100_000_000),
    services: list(item.services, "Services", 200).map(service),
    expenses: list(item.expenses, "Expenses", 500).map(expense),
    notes: list(item.notes, "Vehicle notes", 200).map(note),
  };
}

export function parseGarageSnapshot(value: unknown): GarageSnapshot {
  const snapshot = record(value, "Garage snapshot");
  exact(snapshot, ["schemaVersion", "revision", "vehicles"], "Garage snapshot");
  if (snapshot.schemaVersion !== GARAGE_SCHEMA_VERSION) {
    throw new Error("Please update DiaryDock to open the Garage.");
  }
  return {
    schemaVersion: GARAGE_SCHEMA_VERSION,
    revision: nullableRevision(snapshot.revision),
    vehicles: list(snapshot.vehicles, "Vehicles", 50).map(vehicle),
  };
}
