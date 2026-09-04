import {
  bookingStatuses, bookingTypes, expenseCategories, itineraryTypes, tripStatuses, tripTypes,
  type TravelBooking, type TravelEmergencyInfo, type TravelExpense,
  type TravelItineraryItem, type TravelTraveller, type TravelTripDetails,
} from "./types.ts";
import { boolean, currency, date, dateTime, exact, identifier, list, number,
  oneOf, record, text, time, unique } from "./validation.ts";

export function parseTripDetails(value: unknown): TravelTripDetails {
  const item = record(value, "Trip");
  exact(item, ["title", "destination", "destinationCity", "destinationCountry",
    "destinationTimezone", "startDate", "endDate", "tripType", "currency", "travellerSummary", "transport",
    "accommodation", "bookingReference", "notes", "status"], "Trip");
  const startDate = date(item.startDate, "Trip start date", true);
  const endDate = date(item.endDate, "Trip end date", true);
  if (startDate && endDate && endDate < startDate) throw new Error("Trip dates are invalid.");
  return {
    title: text(item.title, "Trip title", 160),
    destination: text(item.destination, "Destination", 200, true),
    destinationCity: text(item.destinationCity, "Destination city", 120, true),
    destinationCountry: text(item.destinationCountry, "Destination country", 120, true),
    destinationTimezone: text(item.destinationTimezone, "Destination timezone", 80),
    startDate, endDate,
    tripType: oneOf(item.tripType, tripTypes, "Trip type"),
    currency: currency(item.currency),
    travellerSummary: text(item.travellerSummary, "Traveller summary", 500, true),
    transport: text(item.transport, "Transport", 200, true),
    accommodation: text(item.accommodation, "Accommodation", 240, true),
    bookingReference: text(item.bookingReference, "Booking reference", 120, true),
    notes: text(item.notes, "Trip notes", 4_000, true),
    status: oneOf(item.status, tripStatuses, "Trip status"),
  };
}

export function parseTraveller(value: unknown, withId = true): TravelTraveller {
  const item = record(value, "Traveller");
  const keys = ["displayName", "source", "travellerType", "isLead", "passportRequired",
    "passportStatus", "visaStatus", "accessibilityNotes", "dietaryNotes", "medicationNotes"];
  exact(item, withId ? ["id", ...keys] : keys, "Traveller");
  return {
    id: withId ? identifier(item.id, "Traveller ID") : "",
    displayName: text(item.displayName, "Traveller name", 120),
    source: oneOf(item.source, ["household", "contact", "other"], "Traveller source"),
    travellerType: oneOf(item.travellerType, ["adult", "child", "pet"], "Traveller type"),
    isLead: boolean(item.isLead, "Lead traveller"),
    passportRequired: boolean(item.passportRequired, "Passport requirement"),
    passportStatus: oneOf(item.passportStatus,
      ["not-recorded", "review-needed", "ready"], "Passport status"),
    visaStatus: oneOf(item.visaStatus,
      ["not-required", "not-recorded", "review-needed", "ready"], "Visa status"),
    accessibilityNotes: text(item.accessibilityNotes, "Accessibility notes", 1_000, true),
    dietaryNotes: text(item.dietaryNotes, "Dietary notes", 1_000, true),
    medicationNotes: text(item.medicationNotes, "Medication notes", 1_000, true),
  };
}

function identifierList(value: unknown, label: string) {
  const values = list(value, label, 50).map((entry) => identifier(entry, label));
  unique(values, label);
  return values;
}

export function parseBooking(value: unknown, withId = true): TravelBooking {
  const item = record(value, "Booking");
  const keys = ["type", "title", "provider", "bookingReference", "status", "startAt", "endAt",
    "timezone", "location", "address", "amount", "currency", "paymentStatus",
    "cancellationDeadline", "contactDetails", "travellerIds", "notes"];
  exact(item, withId ? ["id", ...keys] : keys, "Booking");
  return {
    id: withId ? identifier(item.id, "Booking ID") : "",
    type: oneOf(item.type, bookingTypes, "Booking type"),
    title: text(item.title, "Booking title", 160),
    provider: text(item.provider, "Booking provider", 160, true),
    bookingReference: text(item.bookingReference, "Booking reference", 120, true),
    status: oneOf(item.status, bookingStatuses, "Booking status"),
    startAt: dateTime(item.startAt, "Booking start", true),
    endAt: dateTime(item.endAt, "Booking end", true),
    timezone: text(item.timezone, "Booking timezone", 80),
    location: text(item.location, "Booking location", 240, true),
    address: text(item.address, "Booking address", 500, true),
    amount: number(item.amount, "Booking amount"),
    currency: currency(item.currency, "Booking currency"),
    paymentStatus: oneOf(item.paymentStatus,
      ["unpaid", "part-paid", "paid", "not-applicable"], "Payment status"),
    cancellationDeadline: dateTime(item.cancellationDeadline, "Cancellation deadline", true),
    contactDetails: text(item.contactDetails, "Booking contact", 500, true),
    travellerIds: identifierList(item.travellerIds, "Booking travellers"),
    notes: text(item.notes, "Booking notes", 2_000, true),
  };
}

export function parseItinerary(value: unknown, withId = true): TravelItineraryItem {
  const item = record(value, "Itinerary item");
  const keys = ["type", "title", "date", "startTime", "endTime", "timezone", "location",
    "address", "provider", "bookingReference", "notes", "cost", "currency", "travellerIds",
    "confirmed", "sortOrder"];
  exact(item, withId ? ["id", ...keys] : keys, "Itinerary item");
  return {
    id: withId ? identifier(item.id, "Itinerary ID") : "",
    type: oneOf(item.type, itineraryTypes, "Itinerary type"),
    title: text(item.title, "Itinerary title", 160),
    date: date(item.date, "Itinerary date"),
    startTime: time(item.startTime, "Itinerary start", true),
    endTime: time(item.endTime, "Itinerary end", true),
    timezone: text(item.timezone, "Itinerary timezone", 80),
    location: text(item.location, "Itinerary location", 240, true),
    address: text(item.address, "Itinerary address", 500, true),
    provider: text(item.provider, "Itinerary provider", 160, true),
    bookingReference: text(item.bookingReference, "Itinerary reference", 120, true),
    notes: text(item.notes, "Itinerary notes", 2_000, true),
    cost: number(item.cost, "Itinerary cost"),
    currency: currency(item.currency, "Itinerary currency"),
    travellerIds: identifierList(item.travellerIds, "Itinerary travellers"),
    confirmed: boolean(item.confirmed, "Itinerary confirmation"),
    sortOrder: number(item.sortOrder, "Itinerary order", 0, 10_000),
  };
}

export function parseExpense(value: unknown, withId = true): TravelExpense {
  const item = record(value, "Trip expense");
  const keys = ["title", "category", "amount", "currency", "status", "paidByTravellerId",
    "notes", "createdAt"];
  exact(item, withId ? ["id", ...keys] : keys.slice(0, -1), "Trip expense");
  return {
    id: withId ? identifier(item.id, "Expense ID") : "",
    title: text(item.title, "Expense title", 160),
    category: oneOf(item.category, expenseCategories, "Expense category"),
    amount: number(item.amount, "Expense amount"),
    currency: currency(item.currency, "Expense currency"),
    status: oneOf(item.status, ["estimated", "unpaid", "paid"], "Expense status"),
    paidByTravellerId: item.paidByTravellerId === null ? null
      : identifier(item.paidByTravellerId, "Paying traveller"),
    notes: text(item.notes, "Expense notes", 2_000, true),
    createdAt: withId ? dateTime(item.createdAt, "Expense creation time") : "",
  };
}

export function parseEmergency(value: unknown): TravelEmergencyInfo {
  const item = record(value, "Emergency information");
  const keys = ["destinationEmergencyNumber", "embassyNotes", "localContact",
    "accommodationAddress", "medicalNotes", "lostPassportNotes", "breakdownDetails",
    "documentLocationNotes"];
  exact(item, keys, "Emergency information");
  return Object.fromEntries(keys.map((key) => [key,
    text(item[key], "Emergency information", 2_000, true)])) as TravelEmergencyInfo;
}
