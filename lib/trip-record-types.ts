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
  "Other"
] as const;

export type TripType = (typeof tripTypes)[number];
export type TripStatus = "draft" | "planning" | "booked" | "ready" | "happening" | "completed" | "cancelled" | "archived";

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

export type TripBookingType = "Flight" | "Train" | "Ferry" | "Accommodation" | "Car hire" | "Transfer" | "Activity" | "Restaurant" | "Parking" | "Lounge" | "Event" | "Other";
export type TripBookingStatus = "draft" | "reserved" | "confirmed" | "payment-due" | "cancelled" | "completed" | "unknown";

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

export type TripItineraryType = "Flight" | "Train" | "Ferry" | "Drive" | "Transfer" | "Hotel check-in" | "Hotel check-out" | "Activity" | "Restaurant" | "Appointment" | "Event" | "Free time" | "Other";

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

export type TripExpenseCategory = "Accommodation" | "Transport" | "Food" | "Activities" | "Shopping" | "Insurance" | "Other";

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

export type TripAccessLevel = "overview" | "itinerary" | "checklist-editor" | "bookings-manager" | "documents" | "emergency" | "full-editor";

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

export type TripsRecord = { trips: Trip[] };
