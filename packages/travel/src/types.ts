export const TRAVEL_SCHEMA_VERSION = 1;

export const tripTypes = ["City break", "Beach holiday", "Family holiday",
  "Business trip", "Road trip", "Cruise", "Camping", "Ski trip",
  "Visiting family", "Weekend away", "Other"] as const;
export const tripStatuses = ["draft", "planning", "booked", "ready", "happening",
  "completed", "cancelled", "archived"] as const;
export const bookingTypes = ["Flight", "Train", "Ferry", "Accommodation", "Car hire",
  "Transfer", "Activity", "Restaurant", "Parking", "Lounge", "Event", "Other"] as const;
export const bookingStatuses = ["draft", "reserved", "confirmed", "payment-due",
  "cancelled", "completed", "unknown"] as const;
export const itineraryTypes = ["Flight", "Train", "Ferry", "Drive", "Transfer",
  "Hotel check-in", "Hotel check-out", "Activity", "Restaurant", "Appointment",
  "Event", "Free time", "Other"] as const;
export const expenseCategories = ["Accommodation", "Transport", "Food", "Activities",
  "Shopping", "Insurance", "Other"] as const;
export const checklistCategories = ["Essentials", "Documents", "Clothes", "Toiletries",
  "Medications", "Tech", "Home before you go", "Travel day"] as const;

export type TripType = (typeof tripTypes)[number];
export type TripStatus = (typeof tripStatuses)[number];
export type BookingType = (typeof bookingTypes)[number];
export type BookingStatus = (typeof bookingStatuses)[number];
export type ItineraryType = (typeof itineraryTypes)[number];
export type ExpenseCategory = (typeof expenseCategories)[number];
export type ChecklistCategory = (typeof checklistCategories)[number];

export type TravelTripDetails = {
  title: string;
  destination: string;
  destinationCity: string;
  destinationCountry: string;
  destinationTimezone: string;
  startDate: string;
  endDate: string;
  tripType: TripType;
  currency: string;
  travellerSummary: string;
  transport: string;
  accommodation: string;
  bookingReference: string;
  notes: string;
  status: TripStatus;
};

export type TravelTraveller = {
  id: string;
  displayName: string;
  source: "household" | "contact" | "other";
  travellerType: "adult" | "child" | "pet";
  isLead: boolean;
  passportRequired: boolean;
  passportStatus: "not-recorded" | "review-needed" | "ready";
  visaStatus: "not-required" | "not-recorded" | "review-needed" | "ready";
  accessibilityNotes: string;
  dietaryNotes: string;
  medicationNotes: string;
};

export type TravelBooking = {
  id: string;
  type: BookingType;
  title: string;
  provider: string;
  bookingReference: string;
  status: BookingStatus;
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
  notes: string;
};

export type TravelItineraryItem = {
  id: string;
  type: ItineraryType;
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
  confirmed: boolean;
  sortOrder: number;
};

export type TravelExpense = {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  status: "estimated" | "unpaid" | "paid";
  paidByTravellerId: string | null;
  notes: string;
  createdAt: string;
};

export type TravelEmergencyInfo = {
  destinationEmergencyNumber: string;
  embassyNotes: string;
  localContact: string;
  accommodationAddress: string;
  medicalNotes: string;
  lostPassportNotes: string;
  breakdownDetails: string;
  documentLocationNotes: string;
};

export type TravelDocumentLink = {
  id: string;
  documentId: string;
  category: string;
  reviewDate: string;
  linkedAt: string;
};

export type TravelTrip = TravelTripDetails & {
  id: string;
  travellers: TravelTraveller[];
  bookings: TravelBooking[];
  itinerary: TravelItineraryItem[];
  documentLinks: TravelDocumentLink[];
  expenses: TravelExpense[];
  emergencyInfo: TravelEmergencyInfo;
  linkedInsurancePolicyId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TravelChecklistItem = {
  id: string;
  tripId: string;
  label: string;
  category: ChecklistCategory;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
};

export type TravelPolicyOption = {
  id: string;
  title: string;
  provider: string;
  policyNumberMasked: string;
  startDate: string;
  renewalDate: string;
};

export type TravelSnapshot = {
  schemaVersion: typeof TRAVEL_SCHEMA_VERSION;
  revision: string | null;
  trips: TravelTrip[];
  checklist: TravelChecklistItem[];
  policies: TravelPolicyOption[];
};

export type TravelMutation =
  | { operation: "SAVE_TRIP"; revision: string | null; tripId: string | null;
      trip: TravelTripDetails }
  | { operation: "DELETE_TRIP"; revision: string | null; tripId: string }
  | { operation: "DUPLICATE_TRIP"; revision: string | null; tripId: string }
  | { operation: "SAVE_TRAVELLER"; revision: string | null; tripId: string;
      recordId: string | null; record: Omit<TravelTraveller, "id"> }
  | { operation: "DELETE_TRAVELLER"; revision: string | null; tripId: string;
      recordId: string }
  | { operation: "SAVE_BOOKING"; revision: string | null; tripId: string;
      recordId: string | null; record: Omit<TravelBooking, "id"> }
  | { operation: "DELETE_BOOKING"; revision: string | null; tripId: string;
      recordId: string }
  | { operation: "SAVE_ITINERARY"; revision: string | null; tripId: string;
      recordId: string | null; record: Omit<TravelItineraryItem, "id"> }
  | { operation: "DELETE_ITINERARY"; revision: string | null; tripId: string;
      recordId: string }
  | { operation: "SAVE_EXPENSE"; revision: string | null; tripId: string;
      recordId: string | null; record: Omit<TravelExpense, "id" | "createdAt"> }
  | { operation: "DELETE_EXPENSE"; revision: string | null; tripId: string;
      recordId: string }
  | { operation: "SAVE_EMERGENCY"; revision: string | null; tripId: string;
      record: TravelEmergencyInfo }
  | { operation: "SAVE_CHECKLIST"; revision: string | null; tripId: string;
      recordId: string | null; record: Pick<TravelChecklistItem, "label" | "category" | "completed"> }
  | { operation: "DELETE_CHECKLIST"; revision: string | null; tripId: string;
      recordId: string }
  | { operation: "LINK_DOCUMENT"; revision: string | null; tripId: string;
      documentId: string; category: string; reviewDate: string }
  | { operation: "UNLINK_DOCUMENT"; revision: string | null; tripId: string;
      recordId: string }
  | { operation: "SET_INSURANCE"; revision: string | null; tripId: string;
      policyId: string | null };
