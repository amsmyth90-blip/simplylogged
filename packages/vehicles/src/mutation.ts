import { parseExpenseCategory } from "./parser.ts";
import type { GarageMutation, GarageService } from "./types.ts";
import {
  date,
  exact,
  finiteNumber,
  nullableNumber,
  nullableRevision,
  record,
  text,
} from "./validation.ts";

const commonKeys = ["operation", "revision", "vehicleId"];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseGarageMutation(value: unknown): GarageMutation {
  const mutation = record(value, "Garage update");
  const operation = mutation.operation;
  const revision = nullableRevision(mutation.revision);
  const vehicleId = text(mutation.vehicleId, "Vehicle ID", 128);
  if (operation === "ADD_VEHICLE") {
    exact(mutation, [...commonKeys, "nickname", "make", "model", "registration", "year"],
      "Garage update");
    if (!uuidPattern.test(vehicleId)) throw new Error("Vehicle ID is invalid.");
    const nickname = text(mutation.nickname, "Vehicle name", 160, true);
    const make = text(mutation.make, "Vehicle make", 100, true);
    const model = text(mutation.model, "Vehicle model", 100, true);
    if (!nickname && !make && !model) throw new Error("Vehicle identity is invalid.");
    return {
      operation,
      revision,
      vehicleId,
      nickname,
      make,
      model,
      registration: text(mutation.registration, "Registration", 32, true).toUpperCase(),
      year: nullableNumber(mutation.year, "Vehicle year", 1886, 2200),
    };
  }
  if (operation === "ADD_EXPENSE") {
    exact(
      mutation,
      [
        ...commonKeys,
        "category",
        "title",
        "provider",
        "amount",
        "date",
        "notes",
      ],
      "Garage update",
    );
    return {
      operation,
      revision,
      vehicleId,
      category: parseExpenseCategory(mutation.category),
      title: text(mutation.title, "Expense title", 160),
      provider: text(mutation.provider, "Expense provider", 160, true),
      amount: finiteNumber(mutation.amount, "Expense amount", 0, 10_000_000),
      date: date(mutation.date, "Expense date"),
      notes: text(mutation.notes, "Expense notes", 2_000, true),
    };
  }
  if (operation === "ADD_SERVICE") {
    exact(
      mutation,
      [
        ...commonKeys,
        "kind",
        "title",
        "provider",
        "date",
        "mileage",
        "cost",
        "notes",
      ],
      "Garage update",
    );
    const kind = mutation.kind;
    if (kind !== "service" && kind !== "repair" && kind !== "inspection") {
      throw new Error("Service type is invalid.");
    }
    return {
      operation,
      revision,
      vehicleId,
      kind: kind as GarageService["kind"],
      title: text(mutation.title, "Service title", 160),
      provider: text(mutation.provider, "Service provider", 160, true),
      date: date(mutation.date, "Service date"),
      mileage: nullableNumber(
        mutation.mileage,
        "Service mileage",
        0,
        10_000_000,
      ),
      cost: nullableNumber(mutation.cost, "Service cost", 0, 10_000_000),
      notes: text(mutation.notes, "Service notes", 2_000, true),
    };
  }
  if (operation === "ADD_MILEAGE") {
    exact(
      mutation,
      [...commonKeys, "mileage", "recordedAt", "note"],
      "Garage update",
    );
    return {
      operation,
      revision,
      vehicleId,
      mileage: finiteNumber(mutation.mileage, "Mileage", 0, 10_000_000),
      recordedAt: date(mutation.recordedAt, "Mileage date"),
      note: text(mutation.note, "Mileage note", 500, true),
    };
  }
  if (operation === "ADD_NOTE") {
    exact(mutation, [...commonKeys, "title", "content"], "Garage update");
    return {
      operation,
      revision,
      vehicleId,
      title: text(mutation.title, "Vehicle note title", 160),
      content: text(mutation.content, "Vehicle note", 4_000),
    };
  }
  throw new Error("Garage update operation is invalid.");
}
