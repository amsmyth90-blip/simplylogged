import { checklistCategories, type TravelMutation } from "./types.ts";
import { parseBooking, parseEmergency, parseExpense, parseItinerary, parseTraveller,
  parseTripDetails } from "./trip-parser.ts";
import { boolean, date, exact, identifier, oneOf, record, revision, text } from "./validation.ts";

const base = ["operation", "revision", "tripId"];
const recordKeys = [...base, "recordId", "record"];

export function parseTravelMutation(value: unknown): TravelMutation {
  const item = record(value, "Travel update");
  const operation = item.operation;
  const parsedRevision = revision(item.revision);
  const tripId = item.tripId === null ? null : identifier(item.tripId, "Trip ID");
  if (operation === "SAVE_TRIP") {
    exact(item, [...base, "trip"], "Travel update");
    return { operation, revision: parsedRevision, tripId, trip: parseTripDetails(item.trip) };
  }
  if (!tripId) throw new Error("Trip ID is invalid.");
  if (operation === "DELETE_TRIP" || operation === "DUPLICATE_TRIP") {
    exact(item, base, "Travel update");
    return { operation, revision: parsedRevision, tripId };
  }
  if (operation === "SAVE_EMERGENCY") {
    exact(item, [...base, "record"], "Travel update");
    return { operation, revision: parsedRevision, tripId, record: parseEmergency(item.record) };
  }
  if (operation === "LINK_DOCUMENT") {
    exact(item, [...base, "documentId", "category", "reviewDate"], "Travel update");
    return { operation, revision: parsedRevision, tripId,
      documentId: identifier(item.documentId, "Document ID"),
      category: text(item.category, "Document category", 100),
      reviewDate: date(item.reviewDate, "Document review date", true) };
  }
  if (operation === "SET_INSURANCE") {
    exact(item, [...base, "policyId"], "Travel update");
    return { operation, revision: parsedRevision, tripId,
      policyId: item.policyId === null ? null : identifier(item.policyId, "Policy ID") };
  }
  if (operation === "SAVE_CHECKLIST") {
    exact(item, recordKeys, "Travel update");
    const value = record(item.record, "Checklist item");
    exact(value, ["label", "category", "completed"], "Checklist item");
    return { operation, revision: parsedRevision, tripId,
      recordId: item.recordId === null ? null : identifier(item.recordId),
      record: { label: text(value.label, "Checklist item", 200),
        category: oneOf(value.category, checklistCategories, "Checklist category"),
        completed: boolean(value.completed, "Checklist status") } };
  }
  const recordId = item.recordId === null ? null : identifier(item.recordId);
  if (["SAVE_TRAVELLER", "SAVE_BOOKING", "SAVE_ITINERARY", "SAVE_EXPENSE"].includes(
    String(operation))) {
    exact(item, recordKeys, "Travel update");
    if (operation === "SAVE_TRAVELLER") return { operation, revision: parsedRevision, tripId,
      recordId, record: withoutId(parseTraveller(item.record, false)) };
    if (operation === "SAVE_BOOKING") return { operation, revision: parsedRevision, tripId,
      recordId, record: withoutId(parseBooking(item.record, false)) };
    if (operation === "SAVE_ITINERARY") return { operation, revision: parsedRevision, tripId,
      recordId, record: withoutId(parseItinerary(item.record, false)) };
    if (operation === "SAVE_EXPENSE") {
      const { id: _id, createdAt: _createdAt, ...expense } = parseExpense(item.record, false);
      void _id;
      void _createdAt;
      return { operation, revision: parsedRevision, tripId, recordId, record: expense };
    }
  }
  const deletes = ["DELETE_TRAVELLER", "DELETE_BOOKING", "DELETE_ITINERARY",
    "DELETE_EXPENSE", "DELETE_CHECKLIST", "UNLINK_DOCUMENT"] as const;
  if (deletes.includes(operation as never)) {
    exact(item, [...base, "recordId"], "Travel update");
    if (!recordId) throw new Error("Record ID is invalid.");
    return { operation: operation as typeof deletes[number], revision: parsedRevision,
      tripId, recordId } as TravelMutation;
  }
  throw new Error("Travel operation is invalid.");
}

function withoutId<Value extends { id: string }>(value: Value): Omit<Value, "id"> {
  const { id: _id, ...rest } = value;
  void _id;
  return rest;
}
