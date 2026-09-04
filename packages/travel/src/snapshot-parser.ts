import { TRAVEL_SCHEMA_VERSION, checklistCategories, type TravelChecklistItem,
  type TravelDocumentLink, type TravelPolicyOption, type TravelSnapshot, type TravelTrip } from "./types.ts";
import { parseBooking, parseEmergency, parseExpense, parseItinerary, parseTraveller,
  parseTripDetails } from "./trip-parser.ts";
import { boolean, date, dateTime, exact, identifier, list, oneOf, record, revision,
  text, unique } from "./validation.ts";

function documentLink(value: unknown): TravelDocumentLink {
  const item = record(value, "Trip document link");
  exact(item, ["id", "documentId", "category", "reviewDate", "linkedAt"],
    "Trip document link");
  return {
    id: identifier(item.id, "Trip document link ID"),
    documentId: identifier(item.documentId, "Document ID"),
    category: text(item.category, "Document category", 100),
    reviewDate: date(item.reviewDate, "Document review date", true),
    linkedAt: dateTime(item.linkedAt, "Document link time"),
  };
}

function trip(value: unknown): TravelTrip {
  const item = record(value, "Trip record");
  const detailKeys = ["title", "destination", "destinationCity", "destinationCountry",
    "destinationTimezone", "startDate", "endDate", "tripType", "currency", "travellerSummary", "transport",
    "accommodation", "bookingReference", "notes", "status"];
  exact(item, ["id", ...detailKeys, "travellers", "bookings", "itinerary", "documentLinks",
    "expenses", "emergencyInfo", "linkedInsurancePolicyId", "createdAt", "updatedAt"],
  "Trip record");
  const travellers = list(item.travellers, "Travellers", 50).map((entry) => parseTraveller(entry));
  const bookings = list(item.bookings, "Bookings", 200).map((entry) => parseBooking(entry));
  const itinerary = list(item.itinerary, "Itinerary", 500).map((entry) => parseItinerary(entry));
  const documentLinks = list(item.documentLinks, "Trip documents", 100).map(documentLink);
  const expenses = list(item.expenses, "Trip expenses", 500).map((entry) => parseExpense(entry));
  [travellers, bookings, itinerary, documentLinks, expenses].forEach((entries) =>
    unique(entries.map((entry) => entry.id), "Trip records"));
  return {
    id: identifier(item.id, "Trip ID"),
    ...parseTripDetails(Object.fromEntries(detailKeys.map((key) => [key, item[key]]))),
    travellers, bookings, itinerary, documentLinks, expenses,
    emergencyInfo: parseEmergency(item.emergencyInfo),
    linkedInsurancePolicyId: item.linkedInsurancePolicyId === null ? null
      : identifier(item.linkedInsurancePolicyId, "Insurance policy ID"),
    createdAt: dateTime(item.createdAt, "Trip creation time"),
    updatedAt: dateTime(item.updatedAt, "Trip update time"),
  };
}

function checklistItem(value: unknown): TravelChecklistItem {
  const item = record(value, "Travel checklist item");
  exact(item, ["id", "tripId", "label", "category", "completed", "createdAt", "completedAt"],
    "Travel checklist item");
  return {
    id: identifier(item.id, "Checklist ID"),
    tripId: identifier(item.tripId, "Checklist trip ID"),
    label: text(item.label, "Checklist item", 200),
    category: oneOf(item.category, checklistCategories, "Checklist category"),
    completed: boolean(item.completed, "Checklist status"),
    createdAt: dateTime(item.createdAt, "Checklist creation time"),
    completedAt: item.completedAt === null ? null
      : dateTime(item.completedAt, "Checklist completion time"),
  };
}

function policy(value: unknown): TravelPolicyOption {
  const item = record(value, "Travel policy option");
  exact(item, ["id", "title", "provider", "policyNumberMasked", "startDate", "renewalDate"],
    "Travel policy option");
  return { id: identifier(item.id, "Policy ID"), title: text(item.title, "Policy title", 160),
    provider: text(item.provider, "Policy provider", 160, true),
    policyNumberMasked: text(item.policyNumberMasked, "Policy number", 80, true),
    startDate: date(item.startDate, "Policy start date", true),
    renewalDate: date(item.renewalDate, "Policy renewal date", true) };
}

export function parseTravelSnapshot(value: unknown): TravelSnapshot {
  const item = record(value, "Travel snapshot");
  exact(item, ["schemaVersion", "revision", "trips", "checklist", "policies"], "Travel snapshot");
  if (item.schemaVersion !== TRAVEL_SCHEMA_VERSION) {
    throw new Error("Please update DiaryDock to open the Driveway.");
  }
  const trips = list(item.trips, "Trips", 50).map(trip);
  const checklist = list(item.checklist, "Travel checklist", 2_000).map(checklistItem);
  const policies = list(item.policies, "Travel policies", 100).map(policy);
  unique(trips.map((entry) => entry.id), "Trips");
  unique(checklist.map((entry) => entry.id), "Travel checklist");
  unique(policies.map((entry) => entry.id), "Travel policies");
  return { schemaVersion: TRAVEL_SCHEMA_VERSION, revision: revision(item.revision),
    trips, checklist, policies };
}
