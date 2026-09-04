import assert from "node:assert/strict";
import test from "node:test";

import {
  parseGarageMutation,
  parseGarageSnapshot,
} from "../packages/vehicles/src/index.ts";
import {
  mutateGaragePayload,
  projectGarageSnapshot,
} from "../lib/garage/mobile-payload.ts";

const revision = "2026-09-02T09:00:00.000Z";

function vehicle(overrides: Record<string, unknown> = {}) {
  return {
    id: "vehicle-1",
    nickname: "Family car",
    make: "Volvo",
    model: "XC40",
    registration: "AB12 CDE",
    year: 2024,
    mileage: [
      { id: "mileage-new", mileage: 24_500, recordedAt: "2026-08-20" },
      { id: "mileage-old", mileage: 20_000, recordedAt: "2025-08-20" },
    ],
    motDueDate: "2027-02-10",
    taxDueDate: "2027-01-01",
    insuranceRenewalDate: "2026-11-08",
    nextServiceDate: "2027-03-12",
    breakdownRenewalDate: "2026-12-04",
    documentIds: ["doc-1"],
    services: [],
    expenses: [],
    notes: [],
    ...overrides,
  };
}

test("Garage projection is deterministic, private-by-default and selects latest mileage", () => {
  const snapshot = projectGarageSnapshot(
    {
      bankAccount: "must-not-leave-server",
      vehicles: {
        vehicles: [
          vehicle({
            services: [
              {
                id: "service-1",
                kind: "service",
                title: "Annual service",
                provider: "North Garage",
                date: "2026-07-12",
                mileage: 23_900,
                cost: 280,
                notes: "Completed",
              },
              { kind: "service", title: "Missing ID", date: "2026-06-01" },
            ],
            notes: [
              {
                id: "note-1",
                title: "Wheel nut",
                content: "Stored beneath boot floor",
                updatedAt: revision,
              },
            ],
          }),
        ],
      },
    },
    revision,
  );
  assert.equal(snapshot.vehicles[0]?.mileage, 24_500);
  assert.equal(snapshot.vehicles[0]?.services.length, 1);
  assert.equal("bankAccount" in snapshot, false);
  assert.deepEqual(
    projectGarageSnapshot({ vehicles: { vehicles: [vehicle()] } }, revision),
    projectGarageSnapshot({ vehicles: { vehicles: [vehicle()] } }, revision),
  );
});

test("Garage projection remains within the encrypted mobile read-model boundary", () => {
  const history = Array.from({ length: 500 }, (_, index) => ({
    id: `expense-${index}`,
    category: "Other",
    title: `Expense ${index}`,
    provider: "Provider",
    amount: 1,
    date: "2026-08-01",
    notes: "x".repeat(2_000),
  }));
  const vehicles = Array.from({ length: 50 }, (_, index) =>
    vehicle({
      id: `vehicle-${index}`,
      nickname: `Vehicle ${index}`,
      expenses: history,
    }),
  );
  const snapshot = projectGarageSnapshot({ vehicles: { vehicles } }, revision);
  assert.equal(snapshot.vehicles.length, 50);
  assert.ok(JSON.stringify(snapshot).length <= 480 * 1024);
  assert.ok(snapshot.vehicles.every((item) => item.expenses.length > 0));
});

test("Garage mutations preserve unrelated state and use desktop-compatible records", () => {
  const source = {
    privateEstateData: { untouched: true },
    vehicles: { vehicles: [vehicle()] },
  };
  const mutation = parseGarageMutation({
    operation: "ADD_EXPENSE",
    revision,
    vehicleId: "vehicle-1",
    category: "Fuel",
    title: "Petrol",
    provider: "Fuel station",
    amount: 68.25,
    date: "2026-09-01",
    notes: "",
  });
  const result = mutateGaragePayload(source, mutation, () => "fixed");
  assert.equal(result.status, "OK");
  if (result.status !== "OK") return;
  assert.deepEqual(result.payload.privateEstateData, source.privateEstateData);
  const saved = (
    result.payload.vehicles as {
      vehicles: Array<{ expenses: Array<Record<string, unknown>> }>;
    }
  ).vehicles[0]!.expenses[0]!;
  assert.equal(saved.id, "expense-fixed");
  assert.equal(saved.category, "Fuel");
  assert.equal(source.vehicles.vehicles[0]?.expenses.length, 0);
});

test("Garage creates an idempotent desktop-compatible first vehicle", () => {
  const mutation = parseGarageMutation({
    operation: "ADD_VEHICLE",
    revision: null,
    vehicleId: "8d35ac48-9e89-4bf3-89a3-918d03f4d92a",
    nickname: "Family car",
    make: "Volvo",
    model: "XC40",
    registration: "ab12 cde",
    year: 2024,
  });
  const source = { untouched: { private: true }, vehicles: { vehicles: [] } };
  const result = mutateGaragePayload(source, mutation, () => "fixed");
  assert.equal(result.status, "OK");
  if (result.status !== "OK") return;
  assert.deepEqual(result.payload.untouched, source.untouched);
  const record = (result.payload.vehicles as { vehicles: Array<Record<string, unknown>> })
    .vehicles[0]!;
  assert.equal(record.id, mutation.vehicleId);
  assert.equal(record.registration, "AB12 CDE");
  assert.deepEqual(record.services, []);
  assert.deepEqual(record.documentIds, []);
  assert.equal((record.motorInsurance as Record<string, unknown>).status, "not-recorded");

  const replay = mutateGaragePayload(result.payload, mutation, () => "unused");
  assert.equal(replay.status, "OK");
  if (replay.status === "OK") {
    assert.equal((replay.payload.vehicles as { vehicles: unknown[] }).vehicles.length, 1);
  }
});

test("Garage vehicle creation rejects unsafe identity and capacity overflow", () => {
  assert.throws(() => parseGarageMutation({
    operation: "ADD_VEHICLE",
    revision: null,
    vehicleId: "chosen-by-an-attacker",
    nickname: "",
    make: "Volvo",
    model: "XC40",
    registration: "",
    year: null,
  }), /Vehicle ID is invalid/);
  assert.throws(() => parseGarageMutation({
    operation: "ADD_VEHICLE",
    revision: null,
    vehicleId: "8d35ac48-9e89-4bf3-89a3-918d03f4d92a",
    nickname: "",
    make: "",
    model: "",
    registration: "",
    year: null,
  }), /identity is invalid/);

  const mutation = parseGarageMutation({
    operation: "ADD_VEHICLE",
    revision: null,
    vehicleId: "8d35ac48-9e89-4bf3-89a3-918d03f4d92a",
    nickname: "Another car",
    make: "",
    model: "",
    registration: "",
    year: null,
  });
  const result = mutateGaragePayload({ vehicles: {
    vehicles: Array.from({ length: 50 }, (_, index) => vehicle({ id: `vehicle-${index}` })),
  } }, mutation);
  assert.equal(result.status, "CAPACITY");
});

test("Garage contracts reject extra fields and invalid values", () => {
  assert.throws(
    () =>
      parseGarageMutation({
        operation: "ADD_NOTE",
        revision,
        vehicleId: "vehicle-1",
        title: "Note",
        content: "Details",
        ownerId: "another-user",
      }),
    /unsupported information/,
  );
  assert.throws(
    () =>
      parseGarageSnapshot({
        schemaVersion: 1,
        revision,
        vehicles: [],
        secret: true,
      }),
    /unsupported information/,
  );
  assert.throws(
    () =>
      parseGarageMutation({
        operation: "ADD_EXPENSE",
        revision,
        vehicleId: "vehicle-1",
        category: "Other",
        title: "Invalid",
        provider: "",
        amount: -1,
        date: "2026-09-01",
        notes: "",
      }),
    /amount is invalid/,
  );
});
