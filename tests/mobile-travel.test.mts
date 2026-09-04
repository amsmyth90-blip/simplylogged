import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

import {
  parseTravelMutation,
  parseTravelSnapshot,
  parseTripDetails,
  type TravelTripDetails,
} from "../packages/travel/src/index.ts";
import { projectTravelSnapshot } from "../lib/travel/mobile-payload.ts";
import { mutateTravelPayload } from "../lib/travel/mobile-mutation.ts";

const trip: TravelTripDetails = {
  title: "Summer in Rome",
  destination: "Rome, Italy",
  destinationCity: "Rome",
  destinationCountry: "Italy",
  destinationTimezone: "Europe/Rome",
  startDate: "2026-09-10",
  endDate: "2026-09-17",
  tripType: "City break",
  currency: "EUR",
  travellerSummary: "Amy and Sam",
  transport: "Flight",
  accommodation: "Hotel Artemide",
  bookingReference: "ROM-2026",
  notes: "Anniversary trip",
  status: "booked",
};

const emptyEmergency = {
  destinationEmergencyNumber: "112",
  embassyNotes: "",
  localContact: "",
  accommodationAddress: "",
  medicalNotes: "",
  lostPassportNotes: "",
  breakdownDetails: "",
  documentLocationNotes: "",
};

test("Travel contracts are exact, bounded and owner-free", () => {
  assert.deepEqual(parseTripDetails(trip), trip);
  assert.throws(() => parseTripDetails({ ...trip, ownerId: "other" }));
  assert.throws(() => parseTripDetails({ ...trip, endDate: "2026-09-01" }), /dates/);
  assert.throws(() => parseTravelMutation({
    operation: "SAVE_TRIP", revision: null, tripId: null,
    trip: { ...trip, currency: "EURO" },
  }), /Currency/);
  assert.throws(() => parseTravelMutation({
    operation: "SAVE_BOOKING", revision: null, tripId: "trip-1", recordId: null,
    record: { id: "client-chosen", ownerId: "other" },
  }));
});

test("Travel projection preserves usable legacy data and strips private controls", () => {
  const snapshot = projectTravelSnapshot({
    privateSecret: "hidden",
    trips: { trips: [{
      id: "trip-1", ...trip, travellers: trip.travellerSummary, status: "planned",
      storagePath: "owner/private.pdf",
      travellerRecords: [{ id: "person-1", displayName: "Amy Smyth", source: "household",
        travellerType: "adult", isLead: true, passportRequired: true,
        passportStatus: "ready", visaStatus: "not-required", accessibilityNotes: "",
        dietaryNotes: "Vegetarian", medicationNotes: "", passportNumber: "secret" }],
      bookings: [{ id: "booking-1", type: "Flight", title: "Flight to Rome",
        provider: "Airline", bookingReference: "ABC123", status: "confirmed",
        startAt: "2026-09-10T08:00:00.000Z", endAt: "2026-09-10T11:00:00.000Z",
        timezone: "Europe/Rome", location: "Airport", address: "", amount: 500,
        currency: "EUR", paymentStatus: "paid", cancellationDeadline: "",
        contactDetails: "", travellerIds: ["person-1"], documentIds: ["private"], notes: "" }],
      itinerary: [], documentLinks: [], expenses: [], emergencyInfo: emptyEmergency,
      linkedInsurancePolicyId: "policy-1", createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-02T10:00:00.000Z",
    }] },
    travelChecklist: { items: [{ id: "check-1", tripId: "trip-1", label: "Pack passport",
      category: "Documents to take", completed: false,
      createdAt: "2026-08-01T10:00:00.000Z" }] },
    insurance: { policies: [{ id: "policy-1", title: "Travel cover", provider: "Aviva",
      policyNumber: "RAW-SECRET-4512", startDate: "2026-01-01", renewalDate: "2027-01-01" }] },
  }, "2026-09-04T09:00:00.000Z");
  assert.equal(snapshot.trips.length, 1);
  assert.equal(snapshot.trips[0]?.status, "planning");
  assert.equal(snapshot.trips[0]?.travellers[0]?.dietaryNotes, "Vegetarian");
  assert.equal(snapshot.trips[0]?.bookings[0]?.title, "Flight to Rome");
  assert.equal(snapshot.checklist[0]?.category, "Documents");
  assert.equal(snapshot.policies[0]?.policyNumberMasked, "•••• 4512");
  assert.equal(JSON.stringify(snapshot).includes("RAW-SECRET"), false);
  assert.equal(JSON.stringify(snapshot).includes("passportNumber"), false);
  assert.equal(JSON.stringify(snapshot).includes("storagePath"), false);
  assert.deepEqual(parseTravelSnapshot(snapshot), snapshot);
});

test("Travel projection fairly fits multibyte histories to the encrypted cache ceiling", () => {
  const expenses = Array.from({ length: 500 }, (_, index) => ({
    id: `expense-${index}`, title: `Expense ${index}`, category: "Food",
    amount: index, currency: "EUR", status: "paid", paidByTravellerId: null,
    notes: "旅".repeat(1_000), createdAt: "2026-08-01T10:00:00.000Z",
  }));
  const trips = Array.from({ length: 5 }, (_, index) => ({
    id: `trip-${index}`, ...trip, title: `Trip ${index}`, travellerRecords: [], bookings: [],
    itinerary: [], documentLinks: [], expenses, emergencyInfo: emptyEmergency,
    linkedInsurancePolicyId: null, createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-02T10:00:00.000Z",
  }));
  const snapshot = projectTravelSnapshot({ trips: { trips }, travelChecklist: { items: [] } }, null);
  assert.equal(snapshot.trips.length, 5);
  assert.ok(snapshot.trips.every((entry) => entry.expenses.length > 0));
  assert.ok(Buffer.byteLength(JSON.stringify(snapshot), "utf8") <= 480 * 1024);
});

test("Travel mutations accept only action-specific records", () => {
  const mutation = parseTravelMutation({
    operation: "SAVE_CHECKLIST", revision: "2026-09-04T09:00:00.000Z",
    tripId: "trip-1", recordId: null,
    record: { label: "Pack passports", category: "Documents", completed: false },
  });
  assert.equal(mutation.operation, "SAVE_CHECKLIST");
  assert.throws(() => parseTravelMutation({ ...mutation, userId: "other" }));
  assert.deepEqual(parseTravelMutation({
    operation: "DELETE_EXPENSE", revision: null, tripId: "trip-1", recordId: "expense-1",
  }), { operation: "DELETE_EXPENSE", revision: null, tripId: "trip-1", recordId: "expense-1" });
});

test("Travel mutations preserve legacy state and keep references consistent", () => {
  const source = {
    unrelated: { keep: true },
    trips: { legacy: "keep", trips: [{
      id: "trip-1", ...trip, travellers: trip.travellerSummary,
      travellerRecords: [{ id: "person-1", displayName: "Amy" }],
      bookings: [{ id: "booking-1", travellerIds: ["person-1"], documentIds: ["doc-1"] }],
      itinerary: [{ id: "itinerary-1", travellerIds: ["person-1"], bookingId: "booking-1" }],
      expenses: [{ id: "expense-1", paidByTravellerId: "person-1", bookingId: "booking-1" }],
      documentLinks: [{ id: "link-1", documentId: "doc-1" }], secret: "keep",
    }] },
    travelChecklist: { legacy: "keep", items: [
      { id: "check-1", tripId: "trip-1", label: "Pack passport" },
    ] },
  };
  const saved = mutateTravelPayload(source, parseTravelMutation({
    operation: "SAVE_TRIP", revision: null, tripId: "trip-1",
    trip: { ...trip, title: "Updated Rome" },
  }), () => "fixed", "2026-09-04T10:00:00.000Z");
  assert.equal(saved.status, "OK");
  assert.deepEqual(saved.payload?.unrelated, source.unrelated);
  const savedTrip = ((saved.payload?.trips as Record<string, unknown>).trips as Record<string, unknown>[])[0]!;
  assert.equal(savedTrip.title, "Updated Rome");
  assert.equal(savedTrip.secret, "keep");
  assert.deepEqual(savedTrip.documentLinks, source.trips.trips[0]?.documentLinks);

  const removedPerson = mutateTravelPayload(saved.payload, parseTravelMutation({
    operation: "DELETE_TRAVELLER", revision: null, tripId: "trip-1", recordId: "person-1",
  }), () => "fixed", "2026-09-04T11:00:00.000Z");
  const consistentTrips = (removedPerson.payload?.trips as Record<string, unknown>).trips;
  const consistent = (consistentTrips as Record<string, unknown>[])[0]!;
  assert.deepEqual((consistent.bookings as Record<string, unknown>[])[0]?.travellerIds, []);
  assert.equal((consistent.expenses as Record<string, unknown>[])[0]?.paidByTravellerId, undefined);

  const deleted = mutateTravelPayload(removedPerson.payload, parseTravelMutation({
    operation: "DELETE_TRIP", revision: null, tripId: "trip-1",
  }));
  assert.equal(((deleted.payload?.trips as Record<string, unknown>).trips as unknown[]).length, 0);
  assert.equal(((deleted.payload?.travelChecklist as Record<string, unknown>).items as unknown[]).length, 0);
});

test("Travel mutations reject cross-trip record references", () => {
  const source = { trips: { trips: [{ id: "trip-1", travellerRecords: [] }] } };
  const result = mutateTravelPayload(source, parseTravelMutation({
    operation: "SAVE_BOOKING", revision: null, tripId: "trip-1", recordId: null,
    record: {
      type: "Flight", title: "Flight", provider: "", bookingReference: "", status: "confirmed",
      startAt: "", endAt: "", timezone: "Europe/London", location: "", address: "",
      amount: 0, currency: "GBP", paymentStatus: "paid", cancellationDeadline: "",
      contactDetails: "", travellerIds: ["other-trip-person"], notes: "",
    },
  }));
  assert.equal(result.status, "INVALID_REFERENCE");
  assert.equal(result.payload, null);
});

test("Travel links preserve files and validate selectable policies", () => {
  const source = { trips: { trips: [{ id: "trip-1", documentLinks: [] }] },
    insurance: { policies: [{ id: "policy-1" }] } };
  const linked = mutateTravelPayload(source, parseTravelMutation({ operation: "LINK_DOCUMENT",
    revision: null, tripId: "trip-1", documentId: "doc-1", category: "Passport copy",
    reviewDate: "2026-09-01" }), () => "fixed", "2026-08-01T10:00:00.000Z");
  assert.equal(linked.status, "OK");
  const insured = mutateTravelPayload(linked.payload, parseTravelMutation({
    operation: "SET_INSURANCE", revision: null, tripId: "trip-1", policyId: "policy-1",
  }));
  assert.equal(insured.status, "OK");
  const invalid = mutateTravelPayload(insured.payload, parseTravelMutation({
    operation: "SET_INSURANCE", revision: null, tripId: "trip-1", policyId: "other",
  }));
  assert.equal(invalid.status, "INVALID_REFERENCE");
});

test("Travel database writes are revision checked and service-only", async () => {
  const database = new PGlite();
  const migration = await readFile(
    "supabase/migrations/20260904120000_mobile_travel_transaction.sql", "utf8",
  );
  const userId = "11111111-1111-4111-8111-111111111111";
  try {
    await database.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create function auth.role() returns text language sql stable as $$
        select nullif(current_setting('request.jwt.claim.role', true), '')
      $$;
      create table auth.users(id uuid primary key);
      create table public.app_state(
        id text primary key, payload jsonb not null,
        updated_at timestamptz not null default timezone('utc', now())
      );
    `);
    await database.exec(migration);
    await database.query("insert into auth.users values ($1)", [userId]);
    await database.query("select set_config('request.jwt.claim.role', 'authenticated', false)");
    await database.exec("set role authenticated");
    await assert.rejects(database.query(
      "select * from public.apply_mobile_travel_state($1,null,$2::jsonb)",
      [userId, JSON.stringify({ trips: { trips: [] } })],
    ), /permission denied|Service role required/i);
    await database.exec("reset role");
    await database.query("select set_config('request.jwt.claim.role', 'service_role', false)");
    await database.exec("set role service_role");
    const created = await database.query<{ payload: unknown; updated_at: string }>(
      "select * from public.apply_mobile_travel_state($1,null,$2::jsonb)",
      [userId, JSON.stringify({ trips: { trips: [] } })],
    );
    assert.deepEqual(created.rows[0]?.payload, { trips: { trips: [] } });
    const conflict = await database.query(
      "select * from public.apply_mobile_travel_state($1,$2,$3::jsonb)",
      [userId, "2020-01-01T00:00:00.000Z", JSON.stringify({ replaced: true })],
    );
    assert.equal(conflict.rows.length, 0);
  } finally {
    await database.close();
  }
});

test("Mobile Travel uses bounded auth, encrypted cache and the service-only transaction", async () => {
  const [route, server, migration, hook, client, screen, detail, bookings,
    itinerary, travellers, expenses, emergency] = await Promise.all([
    readFile("app/api/mobile/travel/route.ts", "utf8"),
    readFile("lib/travel/mobile-server.ts", "utf8"),
    readFile("supabase/migrations/20260904120000_mobile_travel_transaction.sql", "utf8"),
    readFile("apps/mobile/src/travel/use-travel.ts", "utf8"),
    readFile("apps/mobile/src/travel/travel-client.ts", "utf8"),
    readFile("apps/mobile/src/travel/DrivewayScreen.tsx", "utf8"),
    readFile("apps/mobile/src/travel/TripDetail.tsx", "utf8"),
    readFile("apps/mobile/src/travel/TripBookings.tsx", "utf8"),
    readFile("apps/mobile/src/travel/TripItinerary.tsx", "utf8"),
    readFile("apps/mobile/src/travel/TripTravellers.tsx", "utf8"),
    readFile("apps/mobile/src/travel/TripExpenses.tsx", "utf8"),
    readFile("apps/mobile/src/travel/TripEmergency.tsx", "utf8"),
  ]);
  assert.match(route, /authenticateHybridRequest/);
  assert.match(route, /readBoundedJson\(request, 32 \* 1024\)/);
  assert.match(route, /RequestObservation/);
  assert.match(route, /getSupabaseAdminClient/);
  assert.match(server, /\.eq\("id", userId\)/);
  assert.match(server, /apply_mobile_travel_state/);
  assert.match(server, /\.from\("documents"\)/);
  assert.match(server, /\.eq\("user_id", userId\)/);
  assert.match(migration, /auth\.role\(\) is distinct from 'service_role'/);
  assert.match(migration, /revoke all[\s\S]*authenticated/);
  assert.match(migration, /state\.updated_at = input_expected_revision/);
  assert.match(hook, /CACHE_KEY = "travel"/);
  assert.match(hook, /tryPutReadModel/);
  assert.doesNotMatch(hook, /localStorage|sessionStorage|indexedDB/i);
  assert.match(client, /readBoundedJsonResponse\(response, 512 \* 1024\)/);
  assert.match(screen, /<TripDirectory/);
  assert.match(screen, /<TripDetail/);
  assert.match(detail, /<TripChecklist/);
  assert.match(detail, /<TripDocuments/);
  assert.match(bookings, /SAVE_BOOKING/);
  assert.match(itinerary, /SAVE_ITINERARY/);
  assert.match(travellers, /SAVE_TRAVELLER/);
  assert.match(expenses, /SAVE_EXPENSE/);
  assert.match(emergency, /SAVE_EMERGENCY/);
});
