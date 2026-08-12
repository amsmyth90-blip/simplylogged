"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { BottomNav } from "@/components/BottomNav";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { ModalShell } from "@/components/ModalShell";
import { UiIcon, type IconName } from "@/components/UiIcon";
import type { Reminder, VaultDocument } from "@/lib/mock-data";
import { upsertStructuredReminder } from "@/lib/structured-data";
import {
  emptyTripEmergencyInfo,
  tripDestination,
  tripNights,
  tripReadiness,
  tripTypes,
  type Trip,
  type TripBooking,
  type TripBookingStatus,
  type TripBookingType,
  type TripExpense,
  type TripExpenseCategory,
  type TripItineraryItem,
  type TripItineraryType,
  type TripStatus,
  type TripTraveller,
  type TripType,
} from "@/lib/trip-records";
import type { TravelChecklistItem } from "@/lib/travel-checklist-records";

export const tripSections = [
  "overview",
  "itinerary",
  "bookings",
  "documents",
  "checklist",
  "travellers",
  "insurance",
  "expenses",
  "emergency",
  "settings",
] as const;

export type TripSection = (typeof tripSections)[number];
type AddMode =
  | "booking"
  | "itinerary"
  | "expense"
  | "traveller"
  | "document"
  | null;

const sectionDetails: Record<TripSection, { label: string; icon: IconName }> = {
  overview: { label: "Overview", icon: "home" },
  itinerary: { label: "Itinerary", icon: "calendar" },
  bookings: { label: "Bookings", icon: "briefcase" },
  documents: { label: "Documents", icon: "file" },
  checklist: { label: "Checklist", icon: "check" },
  travellers: { label: "Travellers", icon: "users" },
  insurance: { label: "Insurance", icon: "shield" },
  expenses: { label: "Expenses", icon: "chart" },
  emergency: { label: "Emergency", icon: "alert" },
  settings: { label: "Settings", icon: "gear" },
};

const bookingTypes: TripBookingType[] = [
  "Flight",
  "Train",
  "Ferry",
  "Accommodation",
  "Car hire",
  "Transfer",
  "Activity",
  "Restaurant",
  "Parking",
  "Lounge",
  "Event",
  "Other",
];
const itineraryTypes: TripItineraryType[] = [
  "Flight",
  "Train",
  "Ferry",
  "Drive",
  "Transfer",
  "Hotel check-in",
  "Hotel check-out",
  "Activity",
  "Restaurant",
  "Appointment",
  "Event",
  "Free time",
  "Other",
];
const expenseCategories: TripExpenseCategory[] = [
  "Accommodation",
  "Transport",
  "Food",
  "Activities",
  "Shopping",
  "Insurance",
  "Other",
];

function formatDate(value: string) {
  if (!value) return "Not added";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    }).format(amount || 0);
  } catch {
    return `${currency} ${(amount || 0).toFixed(2)}`;
  }
}

function statusLabel(status: TripStatus) {
  const labels: Record<TripStatus, string> = {
    draft: "Draft",
    planning: "Planning",
    booked: "Booked",
    ready: "Ready to travel",
    happening: "Happening now",
    completed: "Completed",
    cancelled: "Cancelled",
    archived: "Archived",
  };
  return labels[status];
}

function countdownLabel(trip: Trip) {
  const today = new Date().toISOString().slice(0, 10);
  if (!trip.startDate) return "Dates not added";
  if (trip.startDate <= today && (!trip.endDate || trip.endDate >= today))
    return "Trip in progress";
  if (trip.endDate && trip.endDate < today) return "Trip completed";
  const days = Math.max(
    0,
    Math.ceil(
      (new Date(`${trip.startDate}T12:00:00`).getTime() -
        new Date(`${today}T12:00:00`).getTime()) /
        86_400_000,
    ),
  );
  return `${days} day${days === 1 ? "" : "s"} until departure`;
}

function SectionHeading({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h2 className="font-serif text-2xl">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-[#667068]">{detail}</p>
      </div>
      {action}
    </div>
  );
}

function EmptySection({
  title,
  detail,
  icon,
}: {
  title: string;
  detail: string;
  icon: IconName;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#6f8e72]/30 bg-[#eef2e9]/65 px-5 py-9 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#52705a]">
        <UiIcon name={icon} className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#667068]">
        {detail}
      </p>
    </div>
  );
}

function DetailCard({
  icon,
  title,
  detail,
  href,
  onClick,
}: {
  icon: IconName;
  title: string;
  detail: string;
  href?: string;
  onClick?: () => void;
}) {
  const className =
    "flex min-h-[76px] w-full items-center gap-3 rounded-[20px] border border-[#20352a]/[0.07] bg-white/90 p-4 text-left shadow-[0_16px_38px_-34px_rgba(32,53,42,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]";
  const content = (
    <>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#eef2e9] text-[#52705a]">
        <UiIcon name={icon} className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1 block text-[11px] leading-4 text-[#667068]">
          {detail}
        </span>
      </span>
      <UiIcon
        name="chevron-right"
        className="h-4 w-4 shrink-0 text-[#667068]"
      />
    </>
  );
  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function TripAddModal({
  mode,
  trip,
  vaultDocuments,
  people,
  onClose,
  onSave,
}: {
  mode: AddMode;
  trip: Trip;
  vaultDocuments: VaultDocument[];
  people: Array<{ id: string; name: string; source: "household" | "contact" }>;
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
  return (
    <ModalShell
      open={mode !== null}
      title={titleText}
      subtitle={`For ${trip.title}`}
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={save}
          className="min-h-12 w-full rounded-2xl bg-[#2f5140] text-sm font-semibold text-white"
        >
          Save
        </button>
      }
    >
      <div className="space-y-4">
        {mode === "document" ? (
          <label className="block text-xs font-semibold">
            Document
            <select
              value={documentId}
              onChange={(event) => setDocumentId(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
            >
              <option value="">Choose from All Files</option>
              {vaultDocuments.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.title}
                </option>
              ))}
            </select>
          </label>
        ) : mode === "traveller" ? (
          <>
            <label className="block text-xs font-semibold">
              Existing person
              <select
                value={personId}
                onChange={(event) => setPersonId(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
              >
                <option value="">Add by display name instead</option>
                {people.map((person) => (
                  <option
                    key={`${person.source}-${person.id}`}
                    value={person.id}
                  >
                    {person.name}
                  </option>
                ))}
              </select>
            </label>
            {!personId ? (
              <label className="block text-xs font-semibold">
                Display name
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
                />
              </label>
            ) : null}
          </>
        ) : (
          <label className="block text-xs font-semibold">
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
            />
          </label>
        )}
        <label className="block text-xs font-semibold">
          {mode === "traveller"
            ? "Traveller type"
            : mode === "document"
              ? "Document category"
              : "Category"}
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
          >
            <option value="">Choose</option>
            {typeOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        {mode === "booking" || mode === "itinerary" ? (
          <>
            <label className="block text-xs font-semibold">
              Provider
              <input
                value={provider}
                onChange={(event) => setProvider(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
              />
            </label>
            <label className="block text-xs font-semibold">
              Booking reference
              <input
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-semibold">
                Date
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-2 text-sm font-normal"
                />
              </label>
              {mode === "booking" ? (
                <label className="block text-xs font-semibold">
                  End date
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-2 text-sm font-normal"
                  />
                </label>
              ) : (
                <label className="block text-xs font-semibold">
                  Start time
                  <input
                    type="time"
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                    className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-2 text-sm font-normal"
                  />
                </label>
              )}
            </div>
            <label className="block text-xs font-semibold">
              Location
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
              />
            </label>
          </>
        ) : null}
        {mode === "booking" || mode === "itinerary" || mode === "expense" ? (
          <>
            <label className="block text-xs font-semibold">
              Amount ({trip.currency})
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
              />
            </label>
            <label className="block text-xs font-semibold">
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
              >
                {mode === "expense" ? (
                  <>
                    <option value="estimated">Estimated</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                  </>
                ) : (
                  <>
                    <option value="unknown">Status unknown</option>
                    <option value="draft">Draft</option>
                    <option value="reserved">Reserved</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="payment-due">Payment due</option>
                  </>
                )}
              </select>
            </label>
          </>
        ) : null}
        {mode !== "traveller" ? (
          <label className="block text-xs font-semibold">
            Notes
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-2 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 py-3 text-sm font-normal"
            />
          </label>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="rounded-xl bg-[#f8e7e2] px-3 py-2 text-xs font-medium text-[#8a5145]"
          >
            {error}
          </p>
        ) : null}
      </div>
    </ModalShell>
  );
}

function TripDetailsSettings({
  trip,
  onSave,
}: {
  trip: Trip;
  onSave: (trip: Trip) => void;
}) {
  const [draft, setDraft] = useState({
    title: trip.title,
    destinationCity: trip.destinationCity,
    destinationCountry: trip.destinationCountry,
    destinationTimezone: trip.destinationTimezone,
    startDate: trip.startDate,
    endDate: trip.endDate,
    currency: trip.currency,
  });
  const [error, setError] = useState("");
  const save = () => {
    if (!draft.title.trim()) {
      setError("Trip title is required.");
      return;
    }
    if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) {
      setError("The return date must be on or after departure.");
      return;
    }
    onSave({
      ...trip,
      ...draft,
      title: draft.title.trim(),
      destination: [
        draft.destinationCity.trim(),
        draft.destinationCountry.trim(),
      ]
        .filter(Boolean)
        .join(", "),
      updatedAt: new Date().toISOString(),
    });
    setError("");
  };
  return (
    <div className="rounded-[22px] border border-[#20352a]/[0.07] bg-white/90 p-4 md:col-span-2">
      <h3 className="text-sm font-semibold">Trip details</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold">
          Trip title
          <input
            value={draft.title}
            onChange={(event) =>
              setDraft((current) => ({ ...current, title: event.target.value }))
            }
            className="mt-2 min-h-11 w-full rounded-xl border border-[#20352a]/10 px-3 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-semibold">
          Timezone
          <input
            value={draft.destinationTimezone}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                destinationTimezone: event.target.value,
              }))
            }
            className="mt-2 min-h-11 w-full rounded-xl border border-[#20352a]/10 px-3 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-semibold">
          Destination city
          <input
            value={draft.destinationCity}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                destinationCity: event.target.value,
              }))
            }
            className="mt-2 min-h-11 w-full rounded-xl border border-[#20352a]/10 px-3 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-semibold">
          Country
          <input
            value={draft.destinationCountry}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                destinationCountry: event.target.value,
              }))
            }
            className="mt-2 min-h-11 w-full rounded-xl border border-[#20352a]/10 px-3 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-semibold">
          Departure
          <input
            type="date"
            value={draft.startDate}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                startDate: event.target.value,
              }))
            }
            className="mt-2 min-h-11 w-full rounded-xl border border-[#20352a]/10 px-2 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-semibold">
          Return
          <input
            type="date"
            value={draft.endDate}
            min={draft.startDate}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                endDate: event.target.value,
              }))
            }
            className="mt-2 min-h-11 w-full rounded-xl border border-[#20352a]/10 px-2 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-semibold">
          Currency
          <input
            value={draft.currency}
            maxLength={3}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                currency: event.target.value.toUpperCase(),
              }))
            }
            className="mt-2 min-h-11 w-full rounded-xl border border-[#20352a]/10 px-3 text-sm font-normal uppercase"
          />
        </label>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-xs font-semibold text-[#8a5145]">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={save}
        className="mt-4 min-h-11 rounded-full bg-[#2f5140] px-4 text-xs font-semibold text-white"
      >
        Save trip details
      </button>
    </div>
  );
}

export function TripDetailWorkspace({
  tripId,
  section = "overview",
}: {
  tripId: string;
  section?: TripSection;
}) {
  const router = useRouter();
  const { state, updateState, hydrated, repositoryMode } = useDiaryDockData();
  const trip = state.trips.trips.find((item) => item.id === tripId);
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [message, setMessage] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [emergencyDraft, setEmergencyDraft] = useState(
    trip?.emergencyInfo ?? emptyTripEmergencyInfo,
  );
  const [notesDraft, setNotesDraft] = useState(trip?.notes ?? "");

  const tripChecklist = useMemo(
    () => state.travelChecklist.items.filter((item) => item.tripId === tripId),
    [state.travelChecklist.items, tripId],
  );
  if (!hydrated)
    return (
      <main className="min-h-screen bg-[#f5f1e8] p-6">
        <div className="mx-auto h-80 max-w-[1000px] animate-pulse rounded-[28px] bg-white/70" />
      </main>
    );
  if (!trip)
    return (
      <main className="min-h-screen bg-[#f5f1e8] px-4 py-12 text-center text-[#20352a]">
        <UiIcon name="alert" className="mx-auto h-8 w-8 text-[#8a5145]" />
        <h1 className="mt-4 font-serif text-2xl">Trip unavailable</h1>
        <p className="mt-2 text-sm text-[#667068]">
          This trip does not exist in your private DiaryDock records, or access
          is no longer available.
        </p>
        <Link
          href="/driveway/trips"
          className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#2f5140] px-5 text-sm font-semibold text-white"
        >
          Back to My Trips
        </Link>
      </main>
    );

  const remaining = tripChecklist.filter((item) => !item.completed).length;
  const readiness = tripReadiness(trip, remaining, tripChecklist.length);
  const linkedDocuments = trip.documentLinks
    .map((link) => ({
      link,
      document: state.vaultDocuments.find(
        (document) => document.id === link.documentId,
      ),
    }))
    .filter(
      (
        entry,
      ): entry is {
        link: Trip["documentLinks"][number];
        document: VaultDocument;
      } => Boolean(entry.document),
    );
  const linkedPolicy = state.insurance.policies.find(
    (policy) => policy.id === trip.linkedInsurancePolicyId,
  );
  const people = [
    ...state.householdMembers.map((person) => ({
      id: person.id,
      name: person.name,
      source: "household" as const,
    })),
    ...state.professionalContacts.contacts.map((contact) => ({
      id: contact.id,
      name:
        `${contact.firstName} ${contact.lastName}`.trim() || contact.company,
      source: "contact" as const,
    })),
  ];

  const saveTrip = (next: Trip) =>
    updateState((current) => ({
      ...current,
      trips: {
        trips: current.trips.trips.map((item) =>
          item.id === next.id ? next : item,
        ),
      },
    }));
  const patchTrip = (changes: Partial<Trip>) =>
    saveTrip({ ...trip, ...changes, updatedAt: new Date().toISOString() });
  const toggleChecklist = (item: TravelChecklistItem) =>
    updateState((current) => ({
      ...current,
      travelChecklist: {
        items: current.travelChecklist.items.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                completed: !entry.completed,
                completedAt: !entry.completed
                  ? new Date().toISOString()
                  : undefined,
              }
            : entry,
        ),
      },
    }));

  const addReminder = async () => {
    const reminder: Reminder = {
      id: `trip-review-${trip.id}`,
      title: `Review ${trip.title}`,
      note: `Check bookings, documents and checklist for ${tripDestination(trip)}.`,
      roomId: "driveway",
      roomName: "Driveway",
      group: "later",
      timeLabel: trip.startDate
        ? formatDate(trip.startDate)
        : "Before departure",
      dueDate: trip.startDate || undefined,
      priority: "normal",
    };
    updateState((current) => ({
      ...current,
      reminders: [
        reminder,
        ...current.reminders.filter((item) => item.id !== reminder.id),
      ],
      trips: {
        trips: current.trips.trips.map((item) =>
          item.id === trip.id
            ? {
                ...item,
                reminderIds: Array.from(
                  new Set([...item.reminderIds, reminder.id]),
                ),
              }
            : item,
        ),
      },
    }));
    if (repositoryMode === "supabase") await upsertStructuredReminder(reminder);
    setMessage("Trip review reminder added.");
  };

  const duplicateTrip = () => {
    const now = new Date().toISOString();
    const duplicateId = `trip-${Date.now()}`;
    const duplicated: Trip = {
      ...trip,
      id: duplicateId,
      title: `${trip.title} copy`,
      startDate: "",
      endDate: "",
      status: "draft",
      transport: "",
      accommodation: "",
      bookingReference: "",
      bookings: [],
      itinerary: [],
      documentLinks: [],
      expenses: [],
      linkedInsurancePolicyId: undefined,
      shares: [],
      reminderIds: [],
      archivedAt: undefined,
      createdAt: now,
      updatedAt: now,
    };
    const checklist = tripChecklist.map((item, index) => ({
      ...item,
      id: `travel-check-${duplicateId}-${index}`,
      tripId: duplicateId,
      completed: false,
      completedAt: undefined,
      createdAt: now,
    }));
    updateState((current) => ({
      ...current,
      trips: { trips: [duplicated, ...current.trips.trips] },
      travelChecklist: {
        items: [...current.travelChecklist.items, ...checklist],
      },
    }));
    router.push(`/driveway/trips/${duplicateId}/settings`);
  };

  const downloadPack = () => {
    const text = [
      "DiaryDock Offline Trip Pack",
      trip.title,
      tripDestination(trip),
      `${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}`,
      "",
      "Travellers",
      ...trip.travellerRecords.map((item) => `- ${item.displayName}`),
      "",
      "Itinerary",
      ...trip.itinerary.map(
        (item) =>
          `- ${formatDate(item.date)} ${item.startTime} ${item.title} ${item.location}`,
      ),
      "",
      "Bookings",
      ...trip.bookings.map(
        (item) =>
          `- ${item.title} · ${item.provider} · ${item.bookingReference}`,
      ),
      "",
      "Emergency contacts",
      trip.emergencyInfo.destinationEmergencyNumber,
      trip.emergencyInfo.localContact,
      "",
      "Checklist",
      ...tripChecklist.map(
        (item) => `- [${item.completed ? "x" : " "}] ${item.label}`,
      ),
      "",
      "Sensitive identity documents are excluded. Review all details before travel.",
    ]
      .filter((line) => line !== undefined)
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${trip.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "trip"}-offline-pack.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Offline Trip Pack downloaded without identity documents.");
  };

  const nav = (
    <nav
      aria-label="Trip sections"
      className="mt-4 flex gap-2 overflow-x-auto pb-2"
    >
      {tripSections.map((item) => (
        <Link
          key={item}
          href={`/driveway/trips/${trip.id}/${item}`}
          aria-current={section === item ? "page" : undefined}
          className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] ${section === item ? "bg-[#2f5140] text-white" : "border border-[#20352a]/10 bg-white/82 text-[#52705a]"}`}
        >
          <UiIcon name={sectionDetails[item].icon} className="h-3.5 w-3.5" />
          {sectionDetails[item].label}
        </Link>
      ))}
    </nav>
  );

  return (
    <main className="min-h-screen bg-[#f5f1e8] pb-32 text-[#20352a]">
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <span className="absolute -right-16 top-12 h-64 w-64 rounded-full bg-[#dfe7d8]/55 blur-3xl" />
      </div>
      <div className="relative mx-auto w-full max-w-[1080px] px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <header className="overflow-hidden rounded-[28px] bg-[#2f5140] p-5 text-white shadow-[0_24px_55px_-35px_rgba(32,53,42,0.65)]">
          <div className="flex items-start gap-3">
            <Link
              href="/driveway/trips"
              aria-label="Back to My Trips"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10"
            >
              <UiIcon name="arrow-left" className="h-5 w-5" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
                {trip.tripType}
              </p>
              <h1 className="mt-1 truncate font-serif text-3xl">
                {trip.title}
              </h1>
              <p className="mt-1 text-xs text-white/72">
                {tripDestination(trip)} · {formatDate(trip.startDate)} –{" "}
                {formatDate(trip.endDate)} · {tripNights(trip)} nights
              </p>
            </div>
            <span className="rounded-full bg-white/12 px-3 py-2 text-[10px] font-semibold">
              {statusLabel(trip.status)}
            </span>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/[0.08] p-3">
              <p className="text-lg font-bold">{readiness.percent}%</p>
              <p className="text-[9px] uppercase text-white/60">Readiness</p>
            </div>
            <div className="rounded-2xl bg-white/[0.08] p-3">
              <p className="text-lg font-bold">
                {trip.travellerRecords.length}
              </p>
              <p className="text-[9px] uppercase text-white/60">Travellers</p>
            </div>
            <div className="rounded-2xl bg-white/[0.08] p-3">
              <p className="text-sm font-bold">{countdownLabel(trip)}</p>
              <p className="text-[9px] uppercase text-white/60">Timing</p>
            </div>
          </div>
        </header>
        {nav}
        {message ? (
          <div
            role="status"
            className="mt-3 rounded-2xl border border-[#9fb58f]/40 bg-[#e8f0e3] px-4 py-3 text-xs text-[#315b42]"
          >
            {message}
          </div>
        ) : null}

        <div className="mt-5">
          {section === "overview" ? (
            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-5">
                <section className="rounded-[24px] border border-[#20352a]/[0.07] bg-white/90 p-4">
                  <SectionHeading
                    title="Next actions"
                    detail="Based on what has actually been added to this trip."
                  />
                  {readiness.ready === readiness.total ? (
                    <p className="mt-4 rounded-2xl bg-[#e8f0e3] p-4 text-sm text-[#315b42]">
                      Every tracked area is ready. Review the original records
                      before relying on them.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-2">
                      {readiness.areas
                        .filter((area) => !area.ready)
                        .slice(0, 5)
                        .map((area) => (
                          <Link
                            key={area.id}
                            href={`/driveway/trips/${trip.id}/${area.id === "transport" || area.id === "accommodation" ? "bookings" : area.id === "home" ? "checklist" : area.id}`}
                            className="flex min-h-12 items-center gap-3 rounded-2xl bg-[#f6f4ed] px-3 text-xs font-semibold capitalize"
                          >
                            <UiIcon
                              name="alert"
                              className="h-4 w-4 text-[#b07938]"
                            />
                            Review {area.id}
                            <UiIcon
                              name="chevron-right"
                              className="ml-auto h-4 w-4 text-[#667068]"
                            />
                          </Link>
                        ))}
                    </div>
                  )}
                </section>
                <section className="rounded-[24px] border border-[#20352a]/[0.07] bg-white/90 p-4">
                  <SectionHeading
                    title="Timeline preview"
                    detail="Your next itinerary items."
                    action={
                      <Link
                        href={`/driveway/trips/${trip.id}/itinerary`}
                        className="min-h-11 px-2 text-xs font-semibold text-[#52705a]"
                      >
                        View all
                      </Link>
                    }
                  />
                  {trip.itinerary.length ? (
                    <div className="mt-4 space-y-2">
                      {[...trip.itinerary]
                        .sort((a, b) =>
                          `${a.date}${a.startTime}`.localeCompare(
                            `${b.date}${b.startTime}`,
                          ),
                        )
                        .slice(0, 4)
                        .map((item) => (
                          <div
                            key={item.id}
                            className="flex gap-3 rounded-2xl bg-[#f6f4ed] p-3"
                          >
                            <span className="text-[10px] font-semibold text-[#52705a]">
                              {formatDate(item.date)}
                              <br />
                              {item.startTime}
                            </span>
                            <span>
                              <span className="block text-xs font-semibold">
                                {item.title}
                              </span>
                              <span className="mt-1 block text-[10px] text-[#667068]">
                                {item.location || item.type}
                              </span>
                            </span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-xs text-[#667068]">
                      No itinerary items yet.
                    </p>
                  )}
                </section>
                <section className="rounded-[24px] border border-[#20352a]/[0.07] bg-white/90 p-4">
                  <SectionHeading
                    title="Trip notes"
                    detail="General notes for this journey."
                  />
                  <textarea
                    value={notesDraft}
                    onChange={(event) => setNotesDraft(event.target.value)}
                    rows={4}
                    className="mt-4 w-full rounded-2xl border border-[#20352a]/10 bg-[#fffdf8] p-3 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      patchTrip({ notes: notesDraft });
                      setMessage("Trip notes saved.");
                    }}
                    className="mt-3 min-h-11 rounded-full bg-[#2f5140] px-4 text-xs font-semibold text-white"
                  >
                    Save notes
                  </button>
                </section>
              </div>
              <aside className="space-y-3">
                <DetailCard
                  icon="briefcase"
                  title={`${trip.bookings.length} bookings`}
                  detail="Transport, accommodation and reservations"
                  href={`/driveway/trips/${trip.id}/bookings`}
                />
                <DetailCard
                  icon="check"
                  title={`${remaining} checklist items left`}
                  detail={`${tripChecklist.length ? Math.round(((tripChecklist.length - remaining) / tripChecklist.length) * 100) : 0}% complete`}
                  href={`/driveway/trips/${trip.id}/checklist`}
                />
                <DetailCard
                  icon="file"
                  title={`${linkedDocuments.length} linked documents`}
                  detail={`${linkedDocuments.filter((entry) => entry.document.reviewStatus === "needs-review").length} need review`}
                  href={`/driveway/trips/${trip.id}/documents`}
                />
                <DetailCard
                  icon="users"
                  title={`${trip.travellerRecords.length} travellers`}
                  detail="Linked to canonical people records"
                  href={`/driveway/trips/${trip.id}/travellers`}
                />
                <DetailCard
                  icon="bell"
                  title="Add a reminder"
                  detail="Use DiaryDock's shared reminder system"
                  onClick={() => void addReminder()}
                />
                <div className="rounded-[20px] border border-dashed border-[#6f8e72]/30 bg-[#eef2e9]/65 p-4">
                  <p className="text-xs font-semibold">Weather</p>
                  <p className="mt-1 text-[10px] leading-4 text-[#667068]">
                    Weather is not connected yet. DiaryDock will not show an
                    unreliable placeholder forecast.
                  </p>
                </div>
              </aside>
            </div>
          ) : null}

          {section === "itinerary" ? (
            <section>
              <SectionHeading
                title="Itinerary"
                detail="A chronological plan for this trip."
                action={
                  <button
                    type="button"
                    onClick={() => setAddMode("itinerary")}
                    className="min-h-11 rounded-full bg-[#2f5140] px-4 text-xs font-semibold text-white"
                  >
                    + Add item
                  </button>
                }
              />
              {trip.itinerary.length ? (
                <div className="mt-5 space-y-3">
                  {[...trip.itinerary]
                    .sort((a, b) =>
                      `${a.date}${a.startTime}${a.sortOrder}`.localeCompare(
                        `${b.date}${b.startTime}${b.sortOrder}`,
                      ),
                    )
                    .map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[22px] border border-[#20352a]/[0.07] bg-white/90 p-4"
                      >
                        <div className="flex gap-3">
                          <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#eef2e9] text-[#52705a]">
                            <UiIcon name="calendar" className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex justify-between gap-3">
                              <h3 className="text-sm font-semibold">
                                {item.title}
                              </h3>
                              <span className="text-[10px] text-[#667068]">
                                {item.confirmed ? "Confirmed" : "Not confirmed"}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-[#667068]">
                              {formatDate(item.date)} ·{" "}
                              {item.startTime || "Time not added"} ·{" "}
                              {item.location || item.type}
                            </p>
                            {item.notes ? (
                              <p className="mt-2 text-xs leading-5 text-[#4f6256]">
                                {item.notes}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    ))}
                </div>
              ) : (
                <div className="mt-5">
                  <EmptySection
                    icon="calendar"
                    title="No itinerary yet"
                    detail="Add transport, check-ins, activities and free time in date order."
                  />
                </div>
              )}
            </section>
          ) : null}

          {section === "bookings" ? (
            <section>
              <SectionHeading
                title="Bookings"
                detail="Only user-confirmed records are shown as confirmed."
                action={
                  <button
                    type="button"
                    onClick={() => setAddMode("booking")}
                    className="min-h-11 rounded-full bg-[#2f5140] px-4 text-xs font-semibold text-white"
                  >
                    + Add booking
                  </button>
                }
              />
              {trip.bookings.length ? (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {trip.bookings.map((booking) => (
                    <article
                      key={booking.id}
                      className="rounded-[22px] border border-[#20352a]/[0.07] bg-white/90 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase text-[#6f8e72]">
                            {booking.type}
                          </p>
                          <h3 className="mt-1 text-sm font-semibold">
                            {booking.title}
                          </h3>
                          <p className="mt-1 text-xs text-[#667068]">
                            {booking.provider || "Provider not added"}
                          </p>
                        </div>
                        <span className="rounded-full bg-[#eef2e9] px-2 py-1 text-[9px] font-semibold capitalize">
                          {booking.status.replace("-", " ")}
                        </span>
                      </div>
                      <dl className="mt-4 space-y-2 text-xs">
                        <div className="flex justify-between gap-3">
                          <dt className="text-[#667068]">Reference</dt>
                          <dd>{booking.bookingReference || "Not added"}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-[#667068]">Starts</dt>
                          <dd>{formatDate(booking.startAt)}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-[#667068]">Cost</dt>
                          <dd>
                            {formatMoney(booking.amount, booking.currency)}
                          </dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-5">
                  <EmptySection
                    icon="briefcase"
                    title="No bookings yet"
                    detail="Add transport, accommodation, activities and reservations when you have them."
                  />
                </div>
              )}
            </section>
          ) : null}

          {section === "documents" ? (
            <section>
              <SectionHeading
                title="Trip documents"
                detail="Link private files already stored in DiaryDock. Extracted details must be reviewed before use."
                action={
                  <button
                    type="button"
                    onClick={() => setAddMode("document")}
                    className="min-h-11 rounded-full bg-[#2f5140] px-4 text-xs font-semibold text-white"
                  >
                    Link document
                  </button>
                }
              />
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {linkedDocuments.map(({ link, document }) => (
                  <article
                    key={link.id}
                    className="rounded-[22px] border border-[#20352a]/[0.07] bg-white/90 p-4"
                  >
                    <div className="flex gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#eef2e9] text-[#52705a]">
                        <UiIcon name="file" className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold">
                          {document.title}
                        </h3>
                        <p className="mt-1 text-[10px] text-[#667068]">
                          {link.category} · {document.kind} · {document.size}
                        </p>
                        <p
                          className={`mt-2 text-[10px] font-semibold ${document.reviewStatus === "needs-review" ? "text-[#a55443]" : "text-[#52705a]"}`}
                        >
                          {document.reviewStatus === "needs-review"
                            ? "Check extracted details"
                            : "Reviewed"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          patchTrip({
                            documentLinks: trip.documentLinks.filter(
                              (item) => item.id !== link.id,
                            ),
                          })
                        }
                        aria-label={`Unlink ${document.title}`}
                        className="h-11 w-11 text-[#8a5145]"
                      >
                        <UiIcon
                          name="plus"
                          className="mx-auto h-4 w-4 rotate-45"
                        />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {!linkedDocuments.length ? (
                <div className="mt-5">
                  <EmptySection
                    icon="file"
                    title="No trip documents linked"
                    detail="Scan or upload to private All Files, then return here to link the reviewed record."
                  />
                </div>
              ) : null}
              <Link
                href={`/capture?room=driveway&trip=${trip.id}`}
                className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#52705a]/20 bg-[#eef2e9] text-sm font-semibold text-[#315b42]"
              >
                <UiIcon name="camera" className="h-4 w-4" />
                Scan or upload securely
              </Link>
              <p className="mt-3 text-[10px] leading-4 text-[#667068]">
                The original document remains authoritative. Failed analysis
                does not prevent secure storage.
              </p>
            </section>
          ) : null}

          {section === "checklist" ? (
            <section>
              <SectionHeading
                title="Travel checklist"
                detail="This is the existing trip-linked checklist, not a separate list."
                action={
                  <Link
                    href={`/driveway/travel-checklist?trip=${trip.id}`}
                    className="min-h-11 rounded-full bg-[#2f5140] px-4 py-3 text-xs font-semibold text-white"
                  >
                    Open full checklist
                  </Link>
                }
              />
              {tripChecklist.length ? (
                <div className="mt-5 space-y-2">
                  {tripChecklist.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleChecklist(item)}
                      className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-[#20352a]/[0.07] bg-white/90 px-3 text-left"
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.completed ? "bg-[#52705a] text-white" : "border border-[#52705a]/20 bg-white text-transparent"}`}
                      >
                        <UiIcon name="check" className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-sm font-medium ${item.completed ? "text-[#667068] line-through" : ""}`}
                        >
                          {item.label}
                        </span>
                        <span className="text-[10px] text-[#667068]">
                          {item.category}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-5">
                  <EmptySection
                    icon="check"
                    title="No checklist items yet"
                    detail="Open the full Travel Checklist to add custom items, suggestions or a template."
                  />
                </div>
              )}
            </section>
          ) : null}

          {section === "travellers" ? (
            <section>
              <SectionHeading
                title="Travellers"
                detail="People are linked to canonical records; sensitive details are not copied."
                action={
                  <button
                    type="button"
                    onClick={() => setAddMode("traveller")}
                    className="min-h-11 rounded-full bg-[#2f5140] px-4 text-xs font-semibold text-white"
                  >
                    + Add traveller
                  </button>
                }
              />
              {trip.travellerRecords.length ? (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {trip.travellerRecords.map((traveller) => (
                    <article
                      key={traveller.id}
                      className="rounded-[22px] border border-[#20352a]/[0.07] bg-white/90 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#dfe7d8] text-sm font-bold">
                          {traveller.displayName.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-semibold">
                            {traveller.displayName}
                          </h3>
                          <p className="mt-1 text-[10px] capitalize text-[#667068]">
                            {traveller.travellerType} · {traveller.source}{" "}
                            record{traveller.isLead ? " · Lead" : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            patchTrip({
                              travellerRecords: trip.travellerRecords.filter(
                                (item) => item.id !== traveller.id,
                              ),
                            })
                          }
                          aria-label={`Remove ${traveller.displayName}`}
                          className="h-11 w-11 text-[#8a5145]"
                        >
                          <UiIcon
                            name="plus"
                            className="mx-auto h-4 w-4 rotate-45"
                          />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-5">
                  <EmptySection
                    icon="users"
                    title="No travellers linked"
                    detail="Add a household member, existing contact or display-only guest."
                  />
                </div>
              )}
            </section>
          ) : null}

          {section === "insurance" ? (
            <section>
              <SectionHeading
                title="Travel insurance"
                detail="Link an existing policy; DiaryDock does not decide whether it covers this trip."
              />
              {linkedPolicy ? (
                <article className="mt-5 rounded-[24px] border border-[#20352a]/[0.07] bg-white/90 p-5">
                  <div className="flex gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#e8eee3] text-[#315b42]">
                      <UiIcon name="shield" className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold">
                        {linkedPolicy.title}
                      </h3>
                      <p className="mt-1 text-xs text-[#667068]">
                        {linkedPolicy.provider} ·{" "}
                        {linkedPolicy.policyNumberMasked}
                      </p>
                      <p className="mt-2 text-[10px]">
                        {formatDate(linkedPolicy.startDate)} to{" "}
                        {formatDate(linkedPolicy.renewalDate)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      patchTrip({ linkedInsurancePolicyId: undefined })
                    }
                    className="mt-4 min-h-11 rounded-full border border-[#8a5145]/20 px-4 text-xs font-semibold text-[#8a5145]"
                  >
                    Unlink policy
                  </button>
                </article>
              ) : (
                <div className="mt-5">
                  <EmptySection
                    icon="shield"
                    title="No travel insurance policy is linked in DiaryDock"
                    detail="This does not mean the travellers are uninsured. Link a suitable existing policy after reviewing its cover."
                  />
                </div>
              )}
              <label className="mt-4 block text-xs font-semibold">
                Link an existing policy
                <select
                  value={trip.linkedInsurancePolicyId ?? ""}
                  onChange={(event) =>
                    patchTrip({
                      linkedInsurancePolicyId: event.target.value || undefined,
                    })
                  }
                  className="mt-2 min-h-12 w-full rounded-2xl border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
                >
                  <option value="">No policy linked</option>
                  {state.insurance.policies.map((policy) => (
                    <option key={policy.id} value={policy.id}>
                      {policy.title} · {policy.provider}
                    </option>
                  ))}
                </select>
              </label>
              <Link
                href="/office/insurance"
                className="mt-4 flex min-h-12 items-center justify-center rounded-2xl border border-[#52705a]/20 bg-[#eef2e9] text-sm font-semibold text-[#315b42]"
              >
                Open Insurance Hub
              </Link>
            </section>
          ) : null}

          {section === "expenses" ? (
            <section>
              <SectionHeading
                title="Expenses & budget"
                detail="A lightweight trip estimate. Booking costs are not duplicated here."
                action={
                  <button
                    type="button"
                    onClick={() => setAddMode("expense")}
                    className="min-h-11 rounded-full bg-[#2f5140] px-4 text-xs font-semibold text-white"
                  >
                    + Add expense
                  </button>
                }
              />
              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  {
                    label: "Estimated",
                    value: trip.expenses
                      .filter((item) => item.status === "estimated")
                      .reduce((sum, item) => sum + item.amount, 0),
                  },
                  {
                    label: "Unpaid",
                    value: trip.expenses
                      .filter((item) => item.status === "unpaid")
                      .reduce((sum, item) => sum + item.amount, 0),
                  },
                  {
                    label: "Paid",
                    value: trip.expenses
                      .filter((item) => item.status === "paid")
                      .reduce((sum, item) => sum + item.amount, 0),
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl bg-white/90 p-3 text-center"
                  >
                    <p className="text-sm font-bold">
                      {formatMoney(item.value, trip.currency)}
                    </p>
                    <p className="mt-1 text-[9px] uppercase text-[#667068]">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
              {trip.expenses.length ? (
                <div className="mt-4 space-y-2">
                  {trip.expenses.map((expense) => (
                    <article
                      key={expense.id}
                      className="flex min-h-16 items-center gap-3 rounded-2xl border border-[#20352a]/[0.07] bg-white/90 px-4"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#eef2e9] text-[#52705a]">
                        <UiIcon name="chart" className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">
                          {expense.title}
                        </span>
                        <span className="text-[10px] text-[#667068]">
                          {expense.category} · {expense.status}
                        </span>
                      </span>
                      <strong className="text-sm">
                        {formatMoney(expense.amount, expense.currency)}
                      </strong>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-4">
                  <EmptySection
                    icon="chart"
                    title="No optional expenses"
                    detail="Add only costs not already recorded on a booking."
                  />
                </div>
              )}
            </section>
          ) : null}

          {section === "emergency" ? (
            <section>
              <SectionHeading
                title="Emergency information"
                detail="User-entered, offline-friendly details. Verify official numbers before relying on them."
              />
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {(
                  [
                    {
                      key: "destinationEmergencyNumber",
                      label: "Destination emergency number",
                    },
                    { key: "localContact", label: "Local contact" },
                    {
                      key: "accommodationAddress",
                      label: "Accommodation address",
                    },
                    {
                      key: "embassyNotes",
                      label: "Embassy or consulate notes",
                    },
                    {
                      key: "medicalNotes",
                      label: "Critical medical notes (only if appropriate)",
                    },
                    { key: "lostPassportNotes", label: "Lost passport notes" },
                    {
                      key: "breakdownDetails",
                      label: "Road-trip breakdown details",
                    },
                    {
                      key: "documentLocationNotes",
                      label: "Important document locations",
                    },
                  ] as const
                ).map((field) => (
                  <label
                    key={field.key}
                    className="block text-xs font-semibold"
                  >
                    {field.label}
                    <textarea
                      rows={3}
                      value={emergencyDraft[field.key]}
                      onChange={(event) =>
                        setEmergencyDraft((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-2xl border border-[#20352a]/10 bg-white px-3 py-3 text-sm font-normal"
                    />
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  patchTrip({ emergencyInfo: emergencyDraft });
                  setMessage("Emergency information saved.");
                }}
                className="mt-5 min-h-12 rounded-full bg-[#2f5140] px-5 text-sm font-semibold text-white"
              >
                Save emergency information
              </button>
            </section>
          ) : null}

          {section === "settings" ? (
            <section>
              <SectionHeading
                title="Trip settings"
                detail="Manage the trip lifecycle, duplication and private offline summary."
              />
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <TripDetailsSettings
                  trip={trip}
                  onSave={(next) => {
                    saveTrip(next);
                    setMessage("Trip details saved.");
                  }}
                />
                <div className="rounded-[22px] border border-[#20352a]/[0.07] bg-white/90 p-4">
                  <label className="block text-xs font-semibold">
                    Status
                    <select
                      value={trip.status}
                      onChange={(event) =>
                        patchTrip({
                          status: event.target.value as TripStatus,
                          archivedAt:
                            event.target.value === "archived"
                              ? new Date().toISOString()
                              : undefined,
                        })
                      }
                      className="mt-2 min-h-12 w-full rounded-2xl border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
                    >
                      {(
                        [
                          "draft",
                          "planning",
                          "booked",
                          "ready",
                          "happening",
                          "completed",
                          "cancelled",
                          "archived",
                        ] as TripStatus[]
                      ).map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="rounded-[22px] border border-[#20352a]/[0.07] bg-white/90 p-4">
                  <label className="block text-xs font-semibold">
                    Trip type
                    <select
                      value={trip.tripType}
                      onChange={(event) =>
                        patchTrip({ tripType: event.target.value as TripType })
                      }
                      className="mt-2 min-h-12 w-full rounded-2xl border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
                    >
                      {tripTypes.map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={duplicateTrip}
                  className="min-h-[76px] rounded-[20px] border border-[#20352a]/[0.07] bg-white/90 p-4 text-left"
                >
                  <span className="text-sm font-semibold">
                    Duplicate trip structure
                  </span>
                  <span className="mt-1 block text-[10px] leading-4 text-[#667068]">
                    Copies travellers, notes and checklist structure—not dates,
                    bookings, documents, payments or insurance.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={downloadPack}
                  className="min-h-[76px] rounded-[20px] border border-[#20352a]/[0.07] bg-white/90 p-4 text-left"
                >
                  <span className="text-sm font-semibold">
                    Download Offline Trip Pack
                  </span>
                  <span className="mt-1 block text-[10px] leading-4 text-[#667068]">
                    Creates a local text summary without identity documents by
                    default.
                  </span>
                </button>
                <div className="rounded-[20px] border border-[#d8dfd2] bg-[#eef2e9] p-4 md:col-span-2">
                  <h3 className="text-sm font-semibold">
                    Sharing & collaboration
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-[#4f6256]">
                    External trip access is not enabled in this build. DiaryDock
                    will not pretend that a saved name grants access;
                    server-enforced trip permissions and invitation acceptance
                    must be approved and implemented first.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="min-h-12 rounded-2xl border border-[#8a5145]/20 bg-white text-sm font-semibold text-[#8a5145] md:col-span-2"
                >
                  Delete trip
                </button>
              </div>
            </section>
          ) : null}
        </div>
      </div>
      <TripAddModal
        key={`${addMode}-${trip.updatedAt}`}
        mode={addMode}
        trip={trip}
        vaultDocuments={state.vaultDocuments}
        people={people}
        onClose={() => setAddMode(null)}
        onSave={saveTrip}
      />
      <ModalShell
        open={deleteOpen}
        title="Delete this trip?"
        subtitle="The trip and its checklist will be removed. Linked documents remain safely stored in All Files."
        onClose={() => setDeleteOpen(false)}
        footer={
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              className="min-h-12 rounded-2xl border border-[#20352a]/10 bg-white text-sm font-semibold"
            >
              Keep trip
            </button>
            <button
              type="button"
              onClick={() => {
                updateState((current) => ({
                  ...current,
                  trips: {
                    trips: current.trips.trips.filter(
                      (item) => item.id !== trip.id,
                    ),
                  },
                  travelChecklist: {
                    items: current.travelChecklist.items.filter(
                      (item) => item.tripId !== trip.id,
                    ),
                  },
                }));
                setDeleteOpen(false);
                router.push("/driveway/trips");
              }}
              className="min-h-12 rounded-2xl bg-[#8a5145] text-sm font-semibold text-white"
            >
              Delete trip
            </button>
          </div>
        }
      >
        <p className="text-sm leading-6 text-[#667068]">
          This cannot be undone from DiaryDock. Your private files are not
          deleted.
        </p>
      </ModalShell>
      <BottomNav />
    </main>
  );
}
