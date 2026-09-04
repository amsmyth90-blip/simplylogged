import type { TravelMutation } from "@diarydock/travel";

import { jsonUtf8Bytes } from "../serialization/json-size.ts";
import { object, type JsonRecord } from "./projection-values.ts";

type Status = "OK" | "CAPACITY" | "NOT_FOUND" | "INVALID_REFERENCE";
type Result = { status: Status; payload: JsonRecord | null };
const maximumStateBytes = 1_900_000;

function finish(payload: JsonRecord): Result {
  return jsonUtf8Bytes(payload) > maximumStateBytes
    ? { status: "CAPACITY", payload: null }
    : { status: "OK", payload };
}

function replaceRecord(
  source: unknown,
  id: string | null,
  maximum: number,
  prefix: string,
  record: JsonRecord,
  createId: () => string,
) {
  const records = Array.isArray(source) ? [...source] : [];
  if (!id && records.length >= maximum) return null;
  const index = id ? records.findIndex((entry) => object(entry).id === id) : -1;
  if (id && index < 0) return undefined;
  const nextId = id ?? `${prefix}-${createId()}`;
  const existing = index >= 0 ? object(records[index]) : {};
  const next = { ...existing, ...record, id: nextId };
  if (index >= 0) records[index] = next;
  else records.unshift(next);
  return records;
}

function removeRecord(source: unknown, id: string) {
  const records = Array.isArray(source) ? [...source] : [];
  const index = records.findIndex((entry) => object(entry).id === id);
  if (index < 0) return null;
  records.splice(index, 1);
  return records;
}

function tripDetails(record: TravelMutation & { operation: "SAVE_TRIP" }) {
  const { travellerSummary, ...details } = record.trip;
  return { ...details, travellers: travellerSummary };
}

function newTrip(mutation: TravelMutation & { operation: "SAVE_TRIP" }, id: string, now: string) {
  return {
    id, ...tripDetails(mutation), coverImageUrl: undefined,
    travellerRecords: [], bookings: [], itinerary: [], documentLinks: [], expenses: [],
    emergencyInfo: { destinationEmergencyNumber: "", embassyNotes: "", localContact: "",
      accommodationAddress: "", medicalNotes: "", lostPassportNotes: "",
      breakdownDetails: "", documentLocationNotes: "" },
    shares: [], reminderIds: [], createdAt: now, updatedAt: now,
  };
}

function referencesAreValid(trip: JsonRecord, ids: string[], paidBy?: string | null) {
  const travellerIds = new Set((Array.isArray(trip.travellerRecords) ? trip.travellerRecords : [])
    .map((entry) => object(entry).id).filter((id): id is string => typeof id === "string"));
  return ids.every((id) => travellerIds.has(id)) && (!paidBy || travellerIds.has(paidBy));
}

export function mutateTravelPayload(
  current: unknown,
  mutation: TravelMutation,
  createId: () => string = () => crypto.randomUUID(),
  now: string = new Date().toISOString(),
): Result {
  const payload = structuredClone(object(current));
  const tripsRecord = object(payload.trips);
  const trips = Array.isArray(tripsRecord.trips) ? [...tripsRecord.trips] : [];
  const index = mutation.tripId
    ? trips.findIndex((entry) => object(entry).id === mutation.tripId) : -1;

  if (mutation.operation === "SAVE_TRIP") {
    if (!mutation.tripId) {
      if (trips.length >= 50) return { status: "CAPACITY", payload: null };
      trips.unshift(newTrip(mutation, `trip-${createId()}`, now));
    } else {
      if (index < 0) return { status: "NOT_FOUND", payload: null };
      trips[index] = { ...object(trips[index]), ...tripDetails(mutation),
        id: mutation.tripId, updatedAt: now };
    }
    payload.trips = { ...tripsRecord, trips };
    return finish(payload);
  }
  if (index < 0) return { status: "NOT_FOUND", payload: null };
  const trip = { ...object(trips[index]) };

  if (mutation.operation === "DUPLICATE_TRIP") {
    if (trips.length >= 50) return { status: "CAPACITY", payload: null };
    const checklistRecord = object(payload.travelChecklist);
    const items = Array.isArray(checklistRecord.items) ? [...checklistRecord.items] : [];
    const templates = items.filter((entry) => object(entry).tripId === mutation.tripId);
    if (items.length + templates.length > 2_000) return { status: "CAPACITY", payload: null };
    const duplicateId = `trip-${createId()}`;
    const duplicate = structuredClone(trip);
    Object.assign(duplicate, { id: duplicateId, title: `${String(trip.title)} copy`,
      startDate: "", endDate: "", status: "draft", transport: "", accommodation: "",
      bookingReference: "", bookings: [], itinerary: [], documentLinks: [], expenses: [],
      linkedInsurancePolicyId: undefined, shares: [], reminderIds: [], archivedAt: undefined,
      createdAt: now, updatedAt: now });
    trips.unshift(duplicate);
    const duplicatedItems = templates.map((entry) => ({ ...object(entry),
      id: `travel-check-${createId()}`, tripId: duplicateId, completed: false,
      completedAt: undefined, createdAt: now }));
    payload.trips = { ...tripsRecord, trips };
    payload.travelChecklist = { ...checklistRecord, items: [...items, ...duplicatedItems] };
    return finish(payload);
  }

  if (mutation.operation === "DELETE_TRIP") {
    trips.splice(index, 1);
    const checklistRecord = object(payload.travelChecklist);
    const items = (Array.isArray(checklistRecord.items) ? checklistRecord.items : [])
      .filter((entry) => object(entry).tripId !== mutation.tripId);
    payload.trips = { ...tripsRecord, trips };
    payload.travelChecklist = { ...checklistRecord, items };
    return finish(payload);
  }

  if (mutation.operation === "LINK_DOCUMENT") {
    const links = Array.isArray(trip.documentLinks) ? [...trip.documentLinks] : [];
    if (!links.some((entry) => object(entry).documentId === mutation.documentId)) {
      if (links.length >= 100) return { status: "CAPACITY", payload: null };
      links.push({ id: `trip-document-${createId()}`, documentId: mutation.documentId,
        category: mutation.category, reviewDate: mutation.reviewDate, linkedAt: now });
    }
    trip.documentLinks = links;
  } else if (mutation.operation === "UNLINK_DOCUMENT") {
    const links = removeRecord(trip.documentLinks, mutation.recordId);
    if (!links) return { status: "NOT_FOUND", payload: null };
    trip.documentLinks = links;
  } else if (mutation.operation === "SET_INSURANCE") {
    const policies = object(payload.insurance).policies;
    if (mutation.policyId && !(Array.isArray(policies)
      && policies.some((entry) => object(entry).id === mutation.policyId))) {
      return { status: "INVALID_REFERENCE", payload: null };
    }
    trip.linkedInsurancePolicyId = mutation.policyId ?? undefined;
  } else {

  const saveConfig = {
    SAVE_TRAVELLER: ["travellerRecords", 50, "traveller"],
    SAVE_BOOKING: ["bookings", 200, "booking"],
    SAVE_ITINERARY: ["itinerary", 500, "itinerary"],
    SAVE_EXPENSE: ["expenses", 500, "expense"],
  } as const;
  if (mutation.operation in saveConfig) {
    const selected = mutation as Extract<TravelMutation, {
      operation: keyof typeof saveConfig;
    }>;
    const [field, maximum, prefix] = saveConfig[selected.operation];
    if (selected.operation === "SAVE_BOOKING"
      && !referencesAreValid(trip, selected.record.travellerIds)) {
      return { status: "INVALID_REFERENCE", payload: null };
    }
    if (selected.operation === "SAVE_ITINERARY"
      && !referencesAreValid(trip, selected.record.travellerIds)) {
      return { status: "INVALID_REFERENCE", payload: null };
    }
    if (selected.operation === "SAVE_EXPENSE"
      && !referencesAreValid(trip, [], selected.record.paidByTravellerId)) {
      return { status: "INVALID_REFERENCE", payload: null };
    }
    const creating = selected.recordId === null;
    const extra = selected.operation === "SAVE_EXPENSE" && creating ? { createdAt: now }
      : selected.operation === "SAVE_BOOKING" ? creating
        ? { documentIds: [], createdAt: now, updatedAt: now } : { updatedAt: now }
      : selected.operation === "SAVE_ITINERARY" && creating ? { documentIds: [] } : {};
    const records = replaceRecord(trip[field], selected.recordId, maximum, prefix,
      { ...extra, ...selected.record }, createId);
    if (records === null) return { status: "CAPACITY", payload: null };
    if (records === undefined) return { status: "NOT_FOUND", payload: null };
    trip[field] = records;
  } else if (mutation.operation === "SAVE_EMERGENCY") {
    trip.emergencyInfo = { ...object(trip.emergencyInfo), ...mutation.record };
  } else if (mutation.operation === "SAVE_CHECKLIST") {
    const checklistRecord = object(payload.travelChecklist);
    const existing = Array.isArray(checklistRecord.items) ? checklistRecord.items : [];
    const completedAt = mutation.record.completed ? now : undefined;
    const items = replaceRecord(existing, mutation.recordId, 2_000, "checklist",
      { ...mutation.record, tripId: mutation.tripId, createdAt: now, completedAt }, createId);
    if (items === null) return { status: "CAPACITY", payload: null };
    if (items === undefined) return { status: "NOT_FOUND", payload: null };
    payload.travelChecklist = { ...checklistRecord, items };
  } else if (mutation.operation === "DELETE_CHECKLIST") {
    const checklistRecord = object(payload.travelChecklist);
    const items = removeRecord(checklistRecord.items, mutation.recordId);
    if (!items || !Array.isArray(checklistRecord.items)
      || object(checklistRecord.items.find((entry) => object(entry).id === mutation.recordId)).tripId
        !== mutation.tripId) return { status: "NOT_FOUND", payload: null };
    payload.travelChecklist = { ...checklistRecord, items };
  } else {
    if (typeof mutation.recordId !== "string") {
      return { status: "NOT_FOUND", payload: null };
    }
    const recordId = mutation.recordId;
    const field = mutation.operation === "DELETE_TRAVELLER" ? "travellerRecords"
      : mutation.operation === "DELETE_BOOKING" ? "bookings"
      : mutation.operation === "DELETE_ITINERARY" ? "itinerary" : "expenses";
    const records = removeRecord(trip[field], recordId);
    if (!records) return { status: "NOT_FOUND", payload: null };
    trip[field] = records;
    if (mutation.operation === "DELETE_TRAVELLER") clearTravellerReferences(trip, recordId);
    if (mutation.operation === "DELETE_BOOKING") clearBookingReferences(trip, recordId);
  }
  }
  trip.updatedAt = now;
  trips[index] = trip;
  payload.trips = { ...tripsRecord, trips };
  return finish(payload);
}

function clearTravellerReferences(trip: JsonRecord, id: string) {
  for (const field of ["bookings", "itinerary"]) {
    trip[field] = (Array.isArray(trip[field]) ? trip[field] : []).map((entry) => {
      const record = object(entry);
      return { ...record, travellerIds: (Array.isArray(record.travellerIds)
        ? record.travellerIds : []).filter((value) => value !== id) };
    });
  }
  trip.expenses = (Array.isArray(trip.expenses) ? trip.expenses : []).map((entry) => {
    const record = object(entry);
    return record.paidByTravellerId === id ? { ...record, paidByTravellerId: undefined } : record;
  });
}

function clearBookingReferences(trip: JsonRecord, id: string) {
  for (const field of ["itinerary", "expenses"]) {
    trip[field] = (Array.isArray(trip[field]) ? trip[field] : []).map((entry) => {
      const record = object(entry);
      return record.bookingId === id ? { ...record, bookingId: undefined } : record;
    });
  }
}
