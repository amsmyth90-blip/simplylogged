import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { parseTravelMutation } from "../packages/travel/src/index.ts";
import { mutateTravelPayload } from "../lib/travel/mobile-mutation.ts";
import { projectTravelSnapshot } from "../lib/travel/mobile-payload.ts";
import { buildTripPack } from "../apps/mobile/src/travel/trip-pack.ts";

const now = "2026-09-04T09:00:00.000Z";

function travelState() {
  return {
    trips: { trips: [{
      id: "trip-1", title: "Summer in Rome", destination: "Rome, Italy",
      destinationCity: "Rome", destinationCountry: "Italy",
      destinationTimezone: "Europe/Rome", startDate: "2026-09-10", endDate: "2026-09-17",
      tripType: "City break", currency: "EUR", travellers: "Amy and Sam",
      transport: "Flight", accommodation: "Hotel Artemide", bookingReference: "ROM-2026",
      notes: "Anniversary trip", status: "booked", coverImageUrl: "private-image",
      travellerRecords: [{ id: "person-1", displayName: "Amy Smyth", source: "household",
        travellerType: "adult", isLead: true, passportRequired: true, passportStatus: "ready",
        visaStatus: "not-required", accessibilityNotes: "", dietaryNotes: "Vegetarian",
        medicationNotes: "Keep private medication note" }],
      bookings: [{ id: "booking-1", title: "Flight to Rome" }],
      itinerary: [{ id: "itinerary-1", title: "Airport", date: "2026-09-10" }],
      documentLinks: [{ id: "link-1", documentId: "passport-secret-id",
        category: "Passport", reviewDate: "", linkedAt: now }],
      expenses: [{ id: "expense-1", title: "Flights", amount: 500 }],
      emergencyInfo: { destinationEmergencyNumber: "112", embassyNotes: "Embassy note",
        localContact: "Hotel reception +39 000", accommodationAddress: "Via Roma",
        medicalNotes: "Sensitive medical plan", lostPassportNotes: "Private passport process",
        breakdownDetails: "Roadside reference", documentLocationNotes: "Hidden safe location" },
      linkedInsurancePolicyId: "policy-1", shares: ["private-share"],
      reminderIds: ["reminder-1"], archivedAt: "2026-09-20T00:00:00.000Z",
      createdAt: "2026-08-01T10:00:00.000Z", updatedAt: "2026-08-02T10:00:00.000Z",
    }] },
    travelChecklist: { items: [{ id: "check-1", tripId: "trip-1", label: "Pack passport",
      category: "Documents", completed: true, createdAt: now, completedAt: now }] },
    insurance: { policies: [] },
  };
}

test("trip duplication copies reusable planning structure and clears journey records", () => {
  assert.deepEqual(parseTravelMutation({
    operation: "DUPLICATE_TRIP", revision: now, tripId: "trip-1",
  }), { operation: "DUPLICATE_TRIP", revision: now, tripId: "trip-1" });
  assert.throws(() => parseTravelMutation({ operation: "DUPLICATE_TRIP", revision: now,
    tripId: "trip-1", ownerId: "other" }));

  const identifiers = ["new-trip", "new-check"];
  const result = mutateTravelPayload(travelState(), {
    operation: "DUPLICATE_TRIP", revision: now, tripId: "trip-1",
  }, () => identifiers.shift() ?? "unexpected", "2026-09-05T10:00:00.000Z");
  assert.equal(result.status, "OK");
  const payload = result.payload!;
  const trips = (payload.trips as { trips: Array<Record<string, unknown>> }).trips;
  const duplicate = trips[0]!;
  assert.equal(duplicate.id, "trip-new-trip");
  assert.equal(duplicate.title, "Summer in Rome copy");
  assert.equal(duplicate.notes, "Anniversary trip");
  assert.equal((duplicate.travellerRecords as unknown[]).length, 1);
  assert.equal(duplicate.startDate, "");
  assert.equal(duplicate.endDate, "");
  assert.equal(duplicate.status, "draft");
  for (const field of ["bookings", "itinerary", "documentLinks", "expenses"])
    assert.deepEqual(duplicate[field], []);
  assert.equal(duplicate.linkedInsurancePolicyId, undefined);
  assert.deepEqual(duplicate.shares, []);
  assert.deepEqual(duplicate.reminderIds, []);
  const checklist = (payload.travelChecklist as {
    items: Array<Record<string, unknown>>;
  }).items;
  assert.equal(checklist.length, 2);
  assert.deepEqual(checklist[1], {
    id: "travel-check-new-check", tripId: "trip-new-trip", label: "Pack passport",
    category: "Documents", completed: false, createdAt: "2026-09-05T10:00:00.000Z",
    completedAt: undefined,
  });
});

test("offline trip packs include practical details without identity or medical records", () => {
  const snapshot = projectTravelSnapshot(travelState(), now);
  const text = buildTripPack(snapshot.trips[0]!, snapshot.checklist);
  for (const expected of ["Summer in Rome", "Amy Smyth", "Hotel reception +39 000",
    "Pack passport"]) assert.ok(text.includes(expected));
  for (const secret of ["passport-secret-id", "Sensitive medical plan",
    "Private passport process", "Hidden safe location", "Keep private medication note",
    "policy-1", "private-share"]) assert.equal(text.includes(secret), false);
  assert.match(text, /Sensitive identity documents are excluded/);
});

test("Driveway exposes offline sharing while keeping server mutations online-only", async () => {
  const [actions, hook, pack] = await Promise.all([
    readFile("apps/mobile/src/travel/TripActions.tsx", "utf8"),
    readFile("apps/mobile/src/travel/use-travel.ts", "utf8"),
    readFile("apps/mobile/src/travel/trip-pack.ts", "utf8"),
  ]);
  assert.match(actions, /Share Offline Trip Pack/);
  assert.match(actions, /disabled={!online \|\| busy}/);
  assert.match(actions, /DUPLICATE_TRIP/);
  assert.match(hook, /if \(!online\)/);
  assert.match(pack, /@capacitor\/share/);
  assert.doesNotMatch(pack, /medicalNotes|medicationNotes|documentId|policyId/);
});
