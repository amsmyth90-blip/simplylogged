"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import type { Reminder } from "@/lib/mock-data";
import { upsertStructuredReminder } from "@/lib/structured-data";
import {
  emptyTripEmergencyInfo,
  tripDestination,
  type Trip,
  type TripBooking,
  type TripTraveller
} from "@/lib/trip-records";
import type { TravelChecklistItem } from "@/lib/travel-checklist-records";

import {
  blankTrip,
  formatTripDate,
  tripTemplateItems,
  type TripDraft
} from "./trips-model";

export function useCreateTripWizard(onClose: () => void) {
  const router = useRouter();
  const { state, updateState, repositoryMode } = useDiaryDockData();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<TripDraft>(blankTrip);
  const [error, setError] = useState("");
  const people = state.householdMembers;
  const contacts = state.professionalContacts.contacts;

  const close = () => {
    setStep(1);
    setDraft(blankTrip);
    setError("");
    onClose();
  };

  const set = <Key extends keyof TripDraft>(key: Key, value: TripDraft[Key]) => {
    setError("");
    setDraft(current => ({ ...current, [key]: value }));
  };

  const validate = (final: boolean) => {
    if (!draft.title.trim()) return "Add a trip title before saving.";
    if (!final) return "";
    if (!draft.destinationCity.trim() || !draft.destinationCountry.trim()) {
      return "Add the destination city and country.";
    }
    if (!draft.startDate || !draft.endDate) return "Add the departure and return dates.";
    if (draft.endDate < draft.startDate) return "The return date must be on or after the departure date.";
    return "";
  };

  const continueToNextStep = () => {
    if (step === 1) {
      const message = validate(false);
      if (message) {
        setError(message);
        return;
      }
    }
    setStep(value => Math.min(5, value + 1));
  };

  const save = async (asDraft: boolean) => {
    const message = validate(!asDraft);
    if (message) {
      setError(message);
      return;
    }
    const now = new Date().toISOString();
    const tripId = `trip-${Date.now()}`;
    const travellerRecords: TripTraveller[] = [
      ...people.filter(person => draft.travellerIds.includes(person.id)).map((person, index) => ({
        id: `traveller-${tripId}-${person.id}`,
        personId: person.id,
        source: "household" as const,
        displayName: person.name,
        travellerType: person.role.toLowerCase().includes("child") ? "child" as const : "adult" as const,
        isLead: index === 0,
        passportRequired: false,
        passportStatus: "not-recorded" as const,
        visaStatus: "not-recorded" as const,
        accessibilityNotes: "",
        dietaryNotes: "",
        medicationNotes: ""
      })),
      ...contacts.filter(contact => draft.contactIds.includes(contact.id)).map(contact => ({
        id: `traveller-${tripId}-${contact.id}`,
        personId: contact.id,
        source: "contact" as const,
        displayName: `${contact.firstName} ${contact.lastName}`.trim() || contact.company,
        travellerType: "adult" as const,
        isLead: false,
        passportRequired: false,
        passportStatus: "not-recorded" as const,
        visaStatus: "not-recorded" as const,
        accessibilityNotes: "",
        dietaryNotes: "",
        medicationNotes: ""
      })),
      ...draft.otherTravellers.split(",").map(name => name.trim()).filter(Boolean).map((name, index) => ({
        id: `traveller-${tripId}-other-${index}`,
        source: "other" as const,
        displayName: name,
        travellerType: "adult" as const,
        isLead: false,
        passportRequired: false,
        passportStatus: "not-recorded" as const,
        visaStatus: "not-recorded" as const,
        accessibilityNotes: "",
        dietaryNotes: "",
        medicationNotes: ""
      }))
    ];
    const bookings: TripBooking[] = [];
    if (draft.transportType || draft.transportProvider || draft.transportReference) {
      bookings.push(createBooking({
        id: `booking-${tripId}-transport`,
        type: (draft.transportType || "Other") as TripBooking["type"],
        title: draft.transportType || "Transport",
        provider: draft.transportProvider.trim(),
        reference: draft.transportReference.trim(),
        startAt: draft.startDate,
        endAt: "",
        draft,
        travellerRecords,
        now
      }));
    }
    if (draft.accommodationType || draft.accommodationName || draft.accommodationReference) {
      bookings.push(createBooking({
        id: `booking-${tripId}-stay`,
        type: "Accommodation",
        title: draft.accommodationType || "Accommodation",
        provider: draft.accommodationName.trim(),
        reference: draft.accommodationReference.trim(),
        startAt: draft.startDate,
        endAt: draft.endDate,
        draft,
        travellerRecords,
        now
      }));
    }
    const reminderId = draft.createReminder && draft.startDate ? `trip-start-${tripId}` : undefined;
    const trip: Trip = {
      id: tripId,
      title: draft.title.trim(),
      destination: [draft.destinationCity.trim(), draft.destinationCountry.trim()].filter(Boolean).join(", "),
      destinationCity: draft.destinationCity.trim(),
      destinationCountry: draft.destinationCountry.trim(),
      destinationTimezone: draft.destinationTimezone.trim() || "Europe/London",
      startDate: draft.startDate,
      endDate: draft.endDate,
      tripType: draft.tripType,
      currency: draft.currency,
      travellers: travellerRecords.map(item => item.displayName).join(", "),
      transport: draft.transportProvider.trim() || draft.transportType,
      accommodation: draft.accommodationName.trim() || draft.accommodationType,
      bookingReference: draft.transportReference.trim() || draft.accommodationReference.trim(),
      notes: draft.notes.trim(),
      status: asDraft ? "draft" : bookings.length ? "booked" : "planning",
      travellerRecords,
      bookings,
      itinerary: [],
      documentLinks: [],
      expenses: [],
      emergencyInfo: { ...emptyTripEmergencyInfo },
      shares: [],
      reminderIds: reminderId ? [reminderId] : [],
      createdAt: now,
      updatedAt: now
    };
    const checklist: TravelChecklistItem[] = draft.checklistTemplate === "none"
      ? []
      : tripTemplateItems[draft.checklistTemplate].map((item, index) => ({
          id: `travel-check-${tripId}-${index}`,
          tripId,
          label: item.label,
          category: item.category,
          completed: false,
          createdAt: now
        }));
    const reminder: Reminder | undefined = reminderId ? {
      id: reminderId,
      title: `${trip.title} begins`,
      note: `Review travel plans for ${tripDestination(trip)}.`,
      roomId: "driveway",
      roomName: "Driveway",
      group: "later",
      timeLabel: formatTripDate(draft.startDate),
      dueDate: draft.startDate,
      priority: "normal"
    } : undefined;
    updateState(current => ({
      ...current,
      trips: { trips: [trip, ...current.trips.trips] },
      travelChecklist: { items: [...current.travelChecklist.items, ...checklist] },
      reminders: reminder
        ? [reminder, ...current.reminders.filter(item => item.id !== reminder.id)]
        : current.reminders
    }));
    if (reminder && repositoryMode === "supabase") await upsertStructuredReminder(reminder);
    close();
    router.push(`/driveway/trips/${tripId}`);
  };

  return {
    step,
    setStep,
    draft,
    error,
    setError,
    people,
    contacts,
    close,
    set,
    validate,
    continueToNextStep,
    save
  };
}

type BookingOptions = {
  id: string;
  type: TripBooking["type"];
  title: string;
  provider: string;
  reference: string;
  startAt: string;
  endAt: string;
  draft: TripDraft;
  travellerRecords: TripTraveller[];
  now: string;
};

function createBooking(options: BookingOptions): TripBooking {
  return {
    id: options.id,
    type: options.type,
    title: options.title,
    provider: options.provider,
    bookingReference: options.reference,
    status: "unknown",
    startAt: options.startAt,
    endAt: options.endAt,
    timezone: options.draft.destinationTimezone,
    location: options.draft.destinationCity.trim(),
    address: "",
    amount: 0,
    currency: options.draft.currency,
    paymentStatus: "unpaid",
    cancellationDeadline: "",
    contactDetails: "",
    travellerIds: options.travellerRecords.map(item => item.id),
    documentIds: [],
    notes: "",
    createdAt: options.now,
    updatedAt: options.now
  };
}

export type CreateTripWizardController = ReturnType<typeof useCreateTripWizard>;
