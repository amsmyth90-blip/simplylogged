import {
  TRAVEL_SCHEMA_VERSION, parseTravelSnapshot, parseTripDetails, tripStatuses, tripTypes,
  type TravelChecklistItem, type TravelPolicyOption, type TravelSnapshot, type TravelTrip,
} from "@diarydock/travel";

import { jsonUtf8Bytes } from "../serialization/json-size.ts";
import { booking, checklist, documentLink, emergency, expense, itinerary, mapRecords,
  traveller } from "./legacy-records.ts";
import { choice, currency, date, dateTime, identifier, object, text } from "./projection-values.ts";

const snapshotLimit = 480 * 1024;
const epoch = new Date(0).toISOString();

function projectTrip(value: unknown): TravelTrip | null {
  const item = object(value);
  const id = identifier(item.id);
  if (!id) return null;
  const timezone = text(item.destinationTimezone, 80, "Europe/London");
  const status = item.status === "planned" ? "planning"
    : choice(item.status, tripStatuses, "draft");
  const startDate = date(item.startDate);
  const candidateEndDate = date(item.endDate);
  const endDate = startDate && candidateEndDate < startDate ? "" : candidateEndDate;
  try {
    return {
      id,
      ...parseTripDetails({
        title: text(item.title, 160), destination: text(item.destination, 200),
        destinationCity: text(item.destinationCity, 120, text(item.destination, 120)),
        destinationCountry: text(item.destinationCountry, 120), destinationTimezone: timezone,
        startDate, endDate,
        tripType: choice(item.tripType, tripTypes, "Other"), currency: currency(item.currency),
        travellerSummary: text(item.travellers, 500), transport: text(item.transport, 200),
        accommodation: text(item.accommodation, 240),
        bookingReference: text(item.bookingReference, 120), notes: text(item.notes, 4_000), status,
      }),
      travellers: mapRecords(item.travellerRecords, 50, traveller),
      bookings: mapRecords(item.bookings, 200, (entry) => booking(entry, timezone)),
      itinerary: mapRecords(item.itinerary, 500, (entry) => itinerary(entry, timezone)),
      documentLinks: mapRecords(item.documentLinks, 100, documentLink),
      expenses: mapRecords(item.expenses, 500, expense),
      emergencyInfo: emergency(item.emergencyInfo),
      linkedInsurancePolicyId: identifier(item.linkedInsurancePolicyId) || null,
      createdAt: dateTime(item.createdAt, epoch), updatedAt: dateTime(item.updatedAt, epoch),
    };
  } catch { return null; }
}

function emptyTrip(trip: TravelTrip): TravelTrip {
  return { ...trip, travellers: [], bookings: [], itinerary: [], documentLinks: [], expenses: [] };
}

function policy(value: unknown): TravelPolicyOption | null {
  const item = object(value);
  const id = identifier(item.id);
  const title = text(item.title, 160);
  if (!id || !title) return null;
  const masked = text(item.policyNumberMasked, 80);
  const raw = text(item.policyNumber, 160);
  return { id, title, provider: text(item.provider, 160),
    policyNumberMasked: masked || (raw ? `•••• ${raw.slice(-4)}` : ""),
    startDate: date(item.startDate), renewalDate: date(item.renewalDate) };
}

function fitSnapshot(trips: TravelTrip[], checklistItems: TravelChecklistItem[],
  policies: TravelPolicyOption[], revision: string | null) {
  const includedTrips: TravelTrip[] = [];
  const fittedTrips: TravelTrip[] = [];
  const fittedChecklist: TravelChecklistItem[] = [];
  const fittedPolicies: TravelPolicyOption[] = [];
  let size = jsonUtf8Bytes({ schemaVersion: TRAVEL_SCHEMA_VERSION, revision,
    trips: fittedTrips, checklist: fittedChecklist, policies: fittedPolicies });
  for (const source of trips) {
    const target = emptyTrip(source);
    const delta = jsonUtf8Bytes(target) + (fittedTrips.length ? 1 : 0);
    if (size + delta > snapshotLimit) continue;
    includedTrips.push(source); fittedTrips.push(target); size += delta;
  }
  for (const policyEntry of policies) {
    const delta = jsonUtf8Bytes(policyEntry) + (fittedPolicies.length ? 1 : 0);
    if (size + delta > snapshotLimit) break;
    fittedPolicies.push(policyEntry); size += delta;
  }
  let round = 0;
  let added = true;
  while (added) {
    added = false;
    const checklistItem = checklistItems[round];
    if (checklistItem) {
      const delta = jsonUtf8Bytes(checklistItem) + (fittedChecklist.length ? 1 : 0);
      if (size + delta <= snapshotLimit) {
        fittedChecklist.push(checklistItem); size += delta; added = true;
      }
    }
    for (let index = 0; index < includedTrips.length; index += 1) {
      const source = includedTrips[index]!;
      const target = fittedTrips[index]!;
      const candidates = [
        [source.travellers[round], target.travellers], [source.bookings[round], target.bookings],
        [source.itinerary[round], target.itinerary], [source.documentLinks[round], target.documentLinks],
        [source.expenses[round], target.expenses],
      ] as const;
      for (const [entry, collection] of candidates) {
        if (!entry) continue;
        const delta = jsonUtf8Bytes(entry) + (collection.length ? 1 : 0);
        if (size + delta > snapshotLimit) continue;
        collection.push(entry as never); size += delta; added = true;
      }
    }
    round += 1;
  }
  return { fittedTrips, fittedChecklist, fittedPolicies };
}

export function projectTravelSnapshot(payload: unknown, revision: string | null): TravelSnapshot {
  const root = object(payload);
  const tripsRecord = object(root.trips);
  const checklistRecord = object(root.travelChecklist);
  const insuranceRecord = object(root.insurance);
  const trips = mapRecords(tripsRecord.trips, 50, projectTrip);
  const checklistItems = mapRecords(checklistRecord.items, 2_000, checklist);
  const policies = mapRecords(insuranceRecord.policies, 100, policy);
  const { fittedTrips, fittedChecklist, fittedPolicies } = fitSnapshot(
    trips, checklistItems, policies, revision,
  );
  return parseTravelSnapshot({ schemaVersion: TRAVEL_SCHEMA_VERSION, revision,
    trips: fittedTrips, checklist: fittedChecklist, policies: fittedPolicies });
}
