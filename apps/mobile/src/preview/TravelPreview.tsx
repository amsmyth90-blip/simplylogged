import { useMemo } from "react";

import type { TravelSnapshot } from "@diarydock/travel";

import { PreviewStore } from "@mobile/preview/PreviewStore";
import { DrivewayScreen } from "@mobile/travel/DrivewayScreen";

const snapshot: TravelSnapshot = {
  schemaVersion: 1,
  revision: "2026-09-04T10:00:00.000Z",
  trips: [{
    id: "rome-2026", title: "Summer in Rome", destination: "Rome, Italy",
    destinationCity: "Rome", destinationCountry: "Italy", destinationTimezone: "Europe/Rome",
    startDate: "2026-09-10", endDate: "2026-09-17", tripType: "City break",
    currency: "EUR", travellerSummary: "Amy and Sam", transport: "Flight",
    accommodation: "Hotel Artemide", bookingReference: "ROM-2026",
    notes: "Anniversary trip with a relaxed first afternoon.", status: "booked",
    travellers: [{ id: "amy", displayName: "Amy Smyth", source: "household",
      travellerType: "adult", isLead: true, passportRequired: true, passportStatus: "ready",
      visaStatus: "not-required", accessibilityNotes: "", dietaryNotes: "Vegetarian",
      medicationNotes: "" }, { id: "sam", displayName: "Sam Greenwood", source: "household",
      travellerType: "adult", isLead: false, passportRequired: true, passportStatus: "ready",
      visaStatus: "not-required", accessibilityNotes: "", dietaryNotes: "",
      medicationNotes: "" }],
    bookings: [{ id: "flight", type: "Flight", title: "Flights to Rome",
      provider: "British Airways", bookingReference: "BA42ROM", status: "confirmed",
      startAt: "2026-09-10T07:45:00.000Z", endAt: "2026-09-10T10:25:00.000Z",
      timezone: "Europe/Rome", location: "Heathrow Terminal 5", address: "",
      amount: 486, currency: "EUR", paymentStatus: "paid", cancellationDeadline: "",
      contactDetails: "", travellerIds: ["amy", "sam"], notes: "Seats selected." }],
    itinerary: [{ id: "colosseum", type: "Activity", title: "Colosseum tour",
      date: "2026-09-12", startTime: "10:00", endTime: "12:00", timezone: "Europe/Rome",
      location: "Colosseum", address: "Piazza del Colosseo", provider: "Roma Tours",
      bookingReference: "COL-102", notes: "Arrive 20 minutes early.", cost: 94,
      currency: "EUR", travellerIds: ["amy", "sam"], confirmed: true, sortOrder: 1 }],
    documentLinks: [{ id: "passport-pack", documentId: "doc-travel-pack",
      category: "Travel pack", reviewDate: "2026-09-01",
      linkedAt: "2026-08-01T10:00:00.000Z" }],
    expenses: [{ id: "hotel-cost", title: "Hotel", category: "Accommodation", amount: 980,
      currency: "EUR", status: "paid", paidByTravellerId: "amy", notes: "Breakfast included",
      createdAt: "2026-08-01T10:00:00.000Z" }],
    emergencyInfo: { destinationEmergencyNumber: "112", embassyNotes: "British Embassy, Rome",
      localContact: "Hotel reception", accommodationAddress: "Via Nazionale, Rome",
      medicalNotes: "", lostPassportNotes: "Use the emergency travel document checklist.",
      breakdownDetails: "", documentLocationNotes: "Travel pack in All Files." },
    linkedInsurancePolicyId: "policy-travel", createdAt: "2026-07-20T10:00:00.000Z",
    updatedAt: "2026-09-04T10:00:00.000Z",
  }],
  checklist: [
    { id: "check-passport", tripId: "rome-2026", label: "Pack passports",
      category: "Documents", completed: true, createdAt: "2026-08-01T10:00:00.000Z",
      completedAt: "2026-09-03T10:00:00.000Z" },
    { id: "check-charger", tripId: "rome-2026", label: "Pack phone chargers",
      category: "Tech", completed: false, createdAt: "2026-08-01T10:00:00.000Z",
      completedAt: null },
    { id: "check-windows", tripId: "rome-2026", label: "Check windows are locked",
      category: "Home before you go", completed: false,
      createdAt: "2026-08-01T10:00:00.000Z", completedAt: null },
  ],
  policies: [{ id: "policy-travel", title: "Annual travel cover", provider: "Aviva",
    policyNumberMasked: "•••• 4512", startDate: "2026-01-01", renewalDate: "2027-01-01" }],
};

export function TravelPreview() {
  const store = useMemo(() => new PreviewStore(), []);
  return <DrivewayScreen accessToken="preview-access-token-that-is-long-enough" disableOnline
    initialSnapshot={snapshot} store={store} syncStatus="READY" onBack={() => undefined}
    synchronize={async () => true} onNavigate={() => undefined} onScan={() => undefined} />;
}
