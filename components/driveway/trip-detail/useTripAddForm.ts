"use client";
import { useState } from "react";
import type { VaultDocument } from "@/lib/mock-data";
import type {
  Trip,
  TripBooking,
  TripBookingStatus,
  TripBookingType,
  TripExpense,
  TripExpenseCategory,
  TripItineraryItem,
  TripItineraryType,
  TripTraveller,
} from "@/lib/trip-records";
import {
  bookingTypes,
  expenseCategories,
  itineraryTypes,
  type TripAddMode,
} from "./trip-detail-shared";

type Person = { id: string; name: string; source: "household" | "contact" };

export function useTripAddForm({
  mode,
  trip,
  people,
  onClose,
  onSave,
}: {
  mode: TripAddMode;
  trip: Trip;
  vaultDocuments: VaultDocument[];
  people: Person[];
  onClose: () => void;
  onSave: (value: Trip) => void;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("");
  const [provider, setProvider] = useState("");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(trip.startDate);
  const [endDate, setEndDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState(
    mode === "expense" ? "estimated" : "unknown",
  );
  const [documentId, setDocumentId] = useState("");
  const [personId, setPersonId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const save = () => {
    const now = new Date().toISOString();
    if (mode === "booking") {
      if (!title.trim() || !kind) {
        setError("Add a booking title and category.");
        return;
      }
      const booking: TripBooking = {
        id: `booking-${Date.now()}`,
        type: kind as TripBookingType,
        title: title.trim(),
        provider: provider.trim(),
        bookingReference: reference.trim(),
        status: status as TripBookingStatus,
        startAt: date,
        endAt: endDate,
        timezone: trip.destinationTimezone,
        location: location.trim(),
        address: "",
        amount: Number(amount) || 0,
        currency: trip.currency,
        paymentStatus: "unpaid",
        cancellationDeadline: "",
        contactDetails: "",
        travellerIds: [],
        documentIds: [],
        notes: notes.trim(),
        createdAt: now,
        updatedAt: now,
      };
      onSave({
        ...trip,
        bookings: [...trip.bookings, booking],
        updatedAt: now,
      });
    } else if (mode === "itinerary") {
      if (!title.trim() || !kind || !date) {
        setError("Add a title, type and date.");
        return;
      }
      const item: TripItineraryItem = {
        id: `itinerary-${Date.now()}`,
        type: kind as TripItineraryType,
        title: title.trim(),
        date,
        startTime: time,
        endTime: "",
        timezone: trip.destinationTimezone,
        location: location.trim(),
        address: "",
        provider: provider.trim(),
        bookingReference: reference.trim(),
        notes: notes.trim(),
        cost: Number(amount) || 0,
        currency: trip.currency,
        travellerIds: [],
        documentIds: [],
        confirmed: status === "confirmed",
        sortOrder: trip.itinerary.length,
      };
      onSave({ ...trip, itinerary: [...trip.itinerary, item], updatedAt: now });
    } else if (mode === "expense") {
      if (!title.trim() || !kind || Number(amount) <= 0) {
        setError("Add a description, category and amount.");
        return;
      }
      const expense: TripExpense = {
        id: `expense-${Date.now()}`,
        title: title.trim(),
        category: kind as TripExpenseCategory,
        amount: Number(amount),
        currency: trip.currency,
        status:
          status === "paid"
            ? "paid"
            : status === "estimated"
              ? "estimated"
              : "unpaid",
        notes: notes.trim(),
        createdAt: now,
      };
      onSave({
        ...trip,
        expenses: [...trip.expenses, expense],
        updatedAt: now,
      });
    } else if (mode === "document") {
      if (!documentId) {
        setError("Choose a document to link.");
        return;
      }
      if (trip.documentLinks.some((link) => link.documentId === documentId)) {
        setError("This document is already linked.");
        return;
      }
      onSave({
        ...trip,
        documentLinks: [
          ...trip.documentLinks,
          {
            id: `trip-document-${Date.now()}`,
            documentId,
            category: kind || "Other",
            reviewDate: date,
            linkedAt: now,
          },
        ],
        updatedAt: now,
      });
    } else if (mode === "traveller") {
      const existing = people.find((person) => person.id === personId);
      const displayName = existing?.name || title.trim();
      if (!displayName) {
        setError("Choose an existing person or add a display name.");
        return;
      }
      const traveller: TripTraveller = {
        id: `traveller-${Date.now()}`,
        personId: existing?.id,
        source: existing?.source ?? "other",
        displayName,
        travellerType:
          kind === "child" ? "child" : kind === "pet" ? "pet" : "adult",
        isLead: trip.travellerRecords.length === 0,
        passportRequired: false,
        passportStatus: "not-recorded",
        visaStatus: "not-recorded",
        accessibilityNotes: "",
        dietaryNotes: "",
        medicationNotes: "",
      };
      onSave({
        ...trip,
        travellerRecords: [...trip.travellerRecords, traveller],
        travellers: [
          ...trip.travellerRecords.map((item) => item.displayName),
          displayName,
        ].join(", "),
        updatedAt: now,
      });
    }
    onClose();
  };
  const titleText =
    mode === "booking"
      ? "Add a booking"
      : mode === "itinerary"
        ? "Add an itinerary item"
        : mode === "expense"
          ? "Add an expense"
          : mode === "document"
            ? "Link a document"
            : "Add a traveller";
  const typeOptions =
    mode === "booking"
      ? bookingTypes
      : mode === "itinerary"
        ? itineraryTypes
        : mode === "expense"
          ? expenseCategories
          : mode === "document"
            ? [
                "Passport",
                "Visa",
                "Boarding pass",
                "Ticket",
                "Accommodation confirmation",
                "Insurance",
                "Driving document",
                "Medical letter",
                "Activity ticket",
                "Emergency information",
                "Other",
              ]
            : ["adult", "child", "pet"];
  return {
    title,
    kind,
    provider,
    reference,
    date,
    endDate,
    time,
    location,
    amount,
    status,
    documentId,
    personId,
    notes,
    error,
    titleText,
    typeOptions,
    setTitle,
    setKind,
    setProvider,
    setReference,
    setDate,
    setEndDate,
    setTime,
    setLocation,
    setAmount,
    setStatus,
    setDocumentId,
    setPersonId,
    setNotes,
    save,
  };
}

export type TripAddFormController = ReturnType<typeof useTripAddForm>;
