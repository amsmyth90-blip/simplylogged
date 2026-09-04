import {
  bookingStatuses, bookingTypes, checklistCategories, expenseCategories, itineraryTypes,
  parseBooking, parseExpense, parseItinerary, parseTraveller,
  type TravelBooking, type TravelChecklistItem, type TravelDocumentLink,
  type TravelExpense, type TravelItineraryItem, type TravelTraveller,
} from "@diarydock/travel";

import { bool, choice, currency, date, dateTime, finite, identifier, object, text, time,
  type JsonRecord } from "./projection-values.ts";

const epoch = new Date(0).toISOString();

function safe<Value>(build: () => Value): Value | null {
  try { return build(); } catch { return null; }
}

export function traveller(value: unknown): TravelTraveller | null {
  const item = object(value);
  return safe(() => parseTraveller({
    id: identifier(item.id),
    displayName: text(item.displayName, 120),
    source: choice(item.source, ["household", "contact", "other"], "other"),
    travellerType: choice(item.travellerType, ["adult", "child", "pet"], "adult"),
    isLead: bool(item.isLead),
    passportRequired: bool(item.passportRequired),
    passportStatus: choice(item.passportStatus,
      ["not-recorded", "review-needed", "ready"], "not-recorded"),
    visaStatus: choice(item.visaStatus,
      ["not-required", "not-recorded", "review-needed", "ready"], "not-recorded"),
    accessibilityNotes: text(item.accessibilityNotes, 1_000),
    dietaryNotes: text(item.dietaryNotes, 1_000),
    medicationNotes: text(item.medicationNotes, 1_000),
  }));
}

export function booking(value: unknown, timezone: string): TravelBooking | null {
  const item = object(value);
  return safe(() => parseBooking({
    id: identifier(item.id), type: choice(item.type, bookingTypes, "Other"),
    title: text(item.title, 160), provider: text(item.provider, 160),
    bookingReference: text(item.bookingReference, 120),
    status: choice(item.status, bookingStatuses, "unknown"),
    startAt: dateTime(item.startAt), endAt: dateTime(item.endAt),
    timezone: text(item.timezone, 80, timezone), location: text(item.location, 240),
    address: text(item.address, 500), amount: finite(item.amount),
    currency: currency(item.currency),
    paymentStatus: choice(item.paymentStatus,
      ["unpaid", "part-paid", "paid", "not-applicable"], "not-applicable"),
    cancellationDeadline: dateTime(item.cancellationDeadline),
    contactDetails: text(item.contactDetails, 500),
    travellerIds: (Array.isArray(item.travellerIds) ? item.travellerIds : [])
      .slice(0, 50).map(identifier).filter(Boolean),
    notes: text(item.notes, 2_000),
  }));
}

export function itinerary(value: unknown, timezone: string): TravelItineraryItem | null {
  const item = object(value);
  return safe(() => parseItinerary({
    id: identifier(item.id), type: choice(item.type, itineraryTypes, "Other"),
    title: text(item.title, 160), date: date(item.date),
    startTime: time(item.startTime), endTime: time(item.endTime),
    timezone: text(item.timezone, 80, timezone), location: text(item.location, 240),
    address: text(item.address, 500), provider: text(item.provider, 160),
    bookingReference: text(item.bookingReference, 120), notes: text(item.notes, 2_000),
    cost: finite(item.cost), currency: currency(item.currency),
    travellerIds: (Array.isArray(item.travellerIds) ? item.travellerIds : [])
      .slice(0, 50).map(identifier).filter(Boolean),
    confirmed: bool(item.confirmed), sortOrder: finite(item.sortOrder, 10_000),
  }));
}

export function expense(value: unknown): TravelExpense | null {
  const item = object(value);
  return safe(() => parseExpense({
    id: identifier(item.id), title: text(item.title, 160),
    category: choice(item.category, expenseCategories, "Other"),
    amount: finite(item.amount), currency: currency(item.currency),
    status: choice(item.status, ["estimated", "unpaid", "paid"], "estimated"),
    paidByTravellerId: identifier(item.paidByTravellerId) || null,
    notes: text(item.notes, 2_000), createdAt: dateTime(item.createdAt, epoch),
  }));
}

export function documentLink(value: unknown): TravelDocumentLink | null {
  const item = object(value);
  const id = identifier(item.id);
  const documentId = identifier(item.documentId);
  if (!id || !documentId) return null;
  return { id, documentId, category: text(item.category, 100, "Travel document"),
    reviewDate: date(item.reviewDate), linkedAt: dateTime(item.linkedAt, epoch) };
}

const legacyCategories: Record<string, TravelChecklistItem["category"]> = {
  "Documents to take": "Documents", Packing: "Essentials",
  "Home checks": "Home before you go", Journey: "Travel day",
};

export function checklist(value: unknown): TravelChecklistItem | null {
  const item = object(value);
  const id = identifier(item.id);
  const tripId = identifier(item.tripId);
  const label = text(item.label, 200);
  if (!id || !tripId || !label) return null;
  const category = legacyCategories[String(item.category)]
    ?? choice(item.category, checklistCategories, "Essentials");
  return { id, tripId, label, category, completed: bool(item.completed),
    createdAt: dateTime(item.createdAt, epoch),
    completedAt: dateTime(item.completedAt) || null };
}

export function mapRecords<Value>(
  value: unknown, maximum: number, mapper: (entry: unknown) => Value | null,
) {
  return (Array.isArray(value) ? value : []).slice(0, maximum)
    .map(mapper).filter((entry): entry is Value => Boolean(entry));
}

export function emergency(value: unknown) {
  const item: JsonRecord = object(value);
  return {
    destinationEmergencyNumber: text(item.destinationEmergencyNumber, 2_000),
    embassyNotes: text(item.embassyNotes, 2_000), localContact: text(item.localContact, 2_000),
    accommodationAddress: text(item.accommodationAddress, 2_000),
    medicalNotes: text(item.medicalNotes, 2_000),
    lostPassportNotes: text(item.lostPassportNotes, 2_000),
    breakdownDetails: text(item.breakdownDetails, 2_000),
    documentLocationNotes: text(item.documentLocationNotes, 2_000),
  };
}
