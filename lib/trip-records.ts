export const tripTypes = [
  "City break",
  "Beach holiday",
  "Family holiday",
  "Business trip",
  "Road trip",
  "Cruise",
  "Camping",
  "Ski trip",
  "Visiting family",
  "Weekend away",
  "Other",
] as const;

export type TripType = (typeof tripTypes)[number];

export type TripStatus =
  | "draft"
  | "planning"
  | "booked"
  | "ready"
  | "happening"
  | "completed"
  | "cancelled"
  | "archived";

export type TripTraveller = {
  id: string;
  personId?: string;
  source: "household" | "contact" | "other";
  displayName: string;
  travellerType: "adult" | "child" | "pet";
  isLead: boolean;
  passportRequired: boolean;
  passportStatus: "not-recorded" | "review-needed" | "ready";
  visaStatus: "not-required" | "not-recorded" | "review-needed" | "ready";
  accessibilityNotes: string;
  dietaryNotes: string;
  medicationNotes: string;
  emergencyContactId?: string;
};

export type TripBookingType =
  | "Flight"
  | "Train"
  | "Ferry"
  | "Accommodation"
  | "Car hire"
  | "Transfer"
  | "Activity"
  | "Restaurant"
  | "Parking"
  | "Lounge"
  | "Event"
  | "Other";

export type TripBookingStatus =
  | "draft"
  | "reserved"
  | "confirmed"
  | "payment-due"
  | "cancelled"
  | "completed"
  | "unknown";

export type TripBooking = {
  id: string;
  type: TripBookingType;
  title: string;
  provider: string;
  bookingReference: string;
  status: TripBookingStatus;
  startAt: string;
  endAt: string;
  timezone: string;
  location: string;
  address: string;
  amount: number;
  currency: string;
  paymentStatus: "unpaid" | "part-paid" | "paid" | "not-applicable";
  cancellationDeadline: string;
  contactDetails: string;
  travellerIds: string[];
  documentIds: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type TripItineraryType =
  | "Flight"
  | "Train"
  | "Ferry"
  | "Drive"
  | "Transfer"
  | "Hotel check-in"
  | "Hotel check-out"
  | "Activity"
  | "Restaurant"
  | "Appointment"
  | "Event"
  | "Free time"
  | "Other";

export type TripItineraryItem = {
  id: string;
  bookingId?: string;
  type: TripItineraryType;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  location: string;
  address: string;
  provider: string;
  bookingReference: string;
  notes: string;
  cost: number;
  currency: string;
  travellerIds: string[];
  documentIds: string[];
  reminderId?: string;
  confirmed: boolean;
  sortOrder: number;
};

export type TripDocumentLink = {
  id: string;
  documentId: string;
  category: string;
  travellerId?: string;
  bookingId?: string;
  reviewDate: string;
  linkedAt: string;
};

export type TripExpenseCategory =
  | "Accommodation"
  | "Transport"
  | "Food"
  | "Activities"
  | "Shopping"
  | "Insurance"
  | "Other";

export type TripExpense = {
  id: string;
  title: string;
  category: TripExpenseCategory;
  amount: number;
  currency: string;
  status: "estimated" | "unpaid" | "paid";
  paidByTravellerId?: string;
  bookingId?: string;
  receiptDocumentId?: string;
  notes: string;
  createdAt: string;
};

export type TripEmergencyInfo = {
  destinationEmergencyNumber: string;
  embassyNotes: string;
  localContact: string;
  accommodationAddress: string;
  medicalNotes: string;
  lostPassportNotes: string;
  breakdownDetails: string;
  documentLocationNotes: string;
};

export type TripAccessLevel =
  | "overview"
  | "itinerary"
  | "checklist-editor"
  | "bookings-manager"
  | "documents"
  | "emergency"
  | "full-editor";

export type TripShare = {
  id: string;
  contactId?: string;
  displayName: string;
  invitedEmail: string;
  accessLevel: TripAccessLevel;
  status: "draft" | "pending" | "accepted" | "revoked";
  createdAt: string;
  updatedAt: string;
};

export type Trip = {
  id: string;
  title: string;
  destination: string;
  destinationCity: string;
  destinationCountry: string;
  destinationTimezone: string;
  startDate: string;
  endDate: string;
  tripType: TripType;
  currency: string;
  coverImageUrl?: string;
  travellers: string;
  transport: string;
  accommodation: string;
  bookingReference: string;
  notes: string;
  status: TripStatus;
  travellerRecords: TripTraveller[];
  bookings: TripBooking[];
  itinerary: TripItineraryItem[];
  documentLinks: TripDocumentLink[];
  expenses: TripExpense[];
  emergencyInfo: TripEmergencyInfo;
  shares: TripShare[];
  linkedInsurancePolicyId?: string;
  reminderIds: string[];
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type TripsRecord = {
  trips: Trip[];
};

export const emptyTripEmergencyInfo: TripEmergencyInfo = {
  destinationEmergencyNumber: "",
  embassyNotes: "",
  localContact: "",
  accommodationAddress: "",
  medicalNotes: "",
  lostPassportNotes: "",
  breakdownDetails: "",
  documentLocationNotes: "",
};

export function createInitialTripsRecord(): TripsRecord {
  return { trips: [] };
}

function normaliseStatus(status: unknown): TripStatus {
  if (status === "planned") return "planning";
  if (
    status === "draft" ||
    status === "planning" ||
    status === "booked" ||
    status === "ready" ||
    status === "happening" ||
    status === "completed" ||
    status === "cancelled" ||
    status === "archived"
  ) {
    return status;
  }
  return "draft";
}

function isTripType(value: unknown): value is TripType {
  return tripTypes.includes(value as TripType);
}

function hydrateTrip(value: Partial<Trip> & Pick<Trip, "id" | "title">): Trip {
  const destination = value.destination ?? "";
  const destinationCity = value.destinationCity ?? destination;
  const travellerRecords = Array.isArray(value.travellerRecords)
    ? value.travellerRecords
    : [];
  return {
    id: value.id,
    title: value.title,
    destination,
    destinationCity,
    destinationCountry: value.destinationCountry ?? "",
    destinationTimezone: value.destinationTimezone ?? "Europe/London",
    startDate: value.startDate ?? "",
    endDate: value.endDate ?? "",
    tripType: isTripType(value.tripType) ? value.tripType : "Other",
    currency: value.currency || "GBP",
    coverImageUrl: value.coverImageUrl,
    travellers:
      value.travellers ??
      travellerRecords.map((traveller) => traveller.displayName).join(", "),
    transport: value.transport ?? "",
    accommodation: value.accommodation ?? "",
    bookingReference: value.bookingReference ?? "",
    notes: value.notes ?? "",
    status: normaliseStatus(value.status),
    travellerRecords,
    bookings: Array.isArray(value.bookings)
      ? value.bookings.map((booking) => ({
          ...booking,
          travellerIds: Array.isArray(booking.travellerIds)
            ? booking.travellerIds
            : [],
          documentIds: Array.isArray(booking.documentIds)
            ? booking.documentIds
            : [],
        }))
      : [],
    itinerary: Array.isArray(value.itinerary)
      ? value.itinerary.map((item) => ({
          ...item,
          travellerIds: Array.isArray(item.travellerIds)
            ? item.travellerIds
            : [],
          documentIds: Array.isArray(item.documentIds) ? item.documentIds : [],
        }))
      : [],
    documentLinks: Array.isArray(value.documentLinks)
      ? value.documentLinks
      : [],
    expenses: Array.isArray(value.expenses) ? value.expenses : [],
    emergencyInfo: {
      ...emptyTripEmergencyInfo,
      ...(value.emergencyInfo ?? {}),
    },
    shares: Array.isArray(value.shares) ? value.shares : [],
    linkedInsurancePolicyId: value.linkedInsurancePolicyId,
    reminderIds: Array.isArray(value.reminderIds) ? value.reminderIds : [],
    archivedAt: value.archivedAt,
    createdAt: value.createdAt ?? new Date().toISOString(),
    updatedAt: value.updatedAt ?? new Date().toISOString(),
  };
}

export function hydrateTripsRecord(value?: Partial<TripsRecord>): TripsRecord {
  return {
    trips: Array.isArray(value?.trips)
      ? value.trips
          .filter((trip) => Boolean(trip?.id && trip.title))
          .map((trip) =>
            hydrateTrip(trip as Partial<Trip> & Pick<Trip, "id" | "title">),
          )
      : [],
  };
}

export function tripDestination(trip: Trip) {
  return (
    [trip.destinationCity, trip.destinationCountry]
      .filter(Boolean)
      .join(", ") ||
    trip.destination ||
    "Destination not added"
  );
}

export function tripNights(trip: Pick<Trip, "startDate" | "endDate">) {
  if (!trip.startDate || !trip.endDate) return 0;
  const start = new Date(`${trip.startDate}T12:00:00`).getTime();
  const end = new Date(`${trip.endDate}T12:00:00`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.round((end - start) / 86_400_000);
}

export function tripReadiness(
  trip: Trip,
  checklistRemaining: number,
  checklistTotal = 0,
) {
  const areas = [
    {
      id: "transport",
      ready:
        trip.bookings.some(
          (item) =>
            item.type !== "Accommodation" && item.status === "confirmed",
        ) || Boolean(trip.transport),
    },
    {
      id: "accommodation",
      ready:
        trip.bookings.some(
          (item) =>
            item.type === "Accommodation" && item.status === "confirmed",
        ) || Boolean(trip.accommodation),
    },
    { id: "documents", ready: trip.documentLinks.length > 0 },
    { id: "insurance", ready: Boolean(trip.linkedInsurancePolicyId) },
    { id: "checklist", ready: checklistTotal > 0 && checklistRemaining === 0 },
    {
      id: "travellers",
      ready: trip.travellerRecords.length > 0 || Boolean(trip.travellers),
    },
    {
      id: "emergency",
      ready: Boolean(
        trip.emergencyInfo.destinationEmergencyNumber ||
          trip.emergencyInfo.localContact,
      ),
    },
    { id: "home", ready: false },
  ];
  const ready = areas.filter((area) => area.ready).length;
  return {
    areas,
    ready,
    total: areas.length,
    percent: Math.round((ready / areas.length) * 100),
  };
}
