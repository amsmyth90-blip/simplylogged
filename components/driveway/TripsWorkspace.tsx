"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { BottomNav } from "@/components/BottomNav";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { ModalShell } from "@/components/ModalShell";
import { UiIcon, type IconName } from "@/components/UiIcon";
import type { Reminder } from "@/lib/mock-data";
import { upsertStructuredReminder } from "@/lib/structured-data";
import {
  emptyTripEmergencyInfo,
  tripDestination,
  tripNights,
  tripReadiness,
  tripTypes,
  type Trip,
  type TripBooking,
  type TripStatus,
  type TripTraveller,
  type TripType,
} from "@/lib/trip-records";
import type {
  TravelChecklistCategory,
  TravelChecklistItem,
} from "@/lib/travel-checklist-records";

type TripFilter = "all" | "upcoming" | "past" | "draft" | "shared";

type TripDraft = {
  title: string;
  destinationCity: string;
  destinationCountry: string;
  destinationTimezone: string;
  startDate: string;
  endDate: string;
  tripType: TripType;
  currency: string;
  notes: string;
  travellerIds: string[];
  contactIds: string[];
  otherTravellers: string;
  transportType: string;
  transportProvider: string;
  transportReference: string;
  accommodationType: string;
  accommodationName: string;
  accommodationReference: string;
  checklistTemplate: "none" | "city" | "beach" | "family" | "business";
  createReminder: boolean;
};

const blankTrip: TripDraft = {
  title: "",
  destinationCity: "",
  destinationCountry: "",
  destinationTimezone: "Europe/London",
  startDate: "",
  endDate: "",
  tripType: "Other",
  currency: "GBP",
  notes: "",
  travellerIds: [],
  contactIds: [],
  otherTravellers: "",
  transportType: "",
  transportProvider: "",
  transportReference: "",
  accommodationType: "",
  accommodationName: "",
  accommodationReference: "",
  checklistTemplate: "none",
  createReminder: true,
};

const templateItems: Record<
  Exclude<TripDraft["checklistTemplate"], "none">,
  Array<{ label: string; category: TravelChecklistCategory }>
> = {
  city: [
    { label: "Passport or travel ID", category: "Documents" },
    { label: "Accommodation confirmation", category: "Documents" },
    { label: "Comfortable walking shoes", category: "Clothes" },
    { label: "Offline city map", category: "Tech" },
  ],
  beach: [
    { label: "Travel documents", category: "Documents" },
    { label: "Swimwear", category: "Clothes" },
    { label: "Sun cream", category: "Toiletries" },
    { label: "Sun hat", category: "Essentials" },
  ],
  family: [
    { label: "Family travel documents", category: "Documents" },
    { label: "Medicines", category: "Medications" },
    { label: "Journey snacks", category: "Travel day" },
    { label: "Children's entertainment", category: "Essentials" },
  ],
  business: [
    { label: "Meeting documents", category: "Documents" },
    { label: "Business clothes", category: "Clothes" },
    { label: "Laptop charger", category: "Tech" },
    { label: "Travel adapter", category: "Tech" },
  ],
};

function formatDate(value: string) {
  if (!value) return "Date not added";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function dateRange(trip: Trip) {
  if (!trip.startDate && !trip.endDate) return "Dates not added";
  if (!trip.endDate || trip.endDate === trip.startDate)
    return formatDate(trip.startDate);
  return `${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}`;
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

function statusTone(status: TripStatus) {
  if (status === "happening" || status === "ready")
    return "bg-[#dfead9] text-[#315b42]";
  if (status === "cancelled") return "bg-[#f5e4df] text-[#8a5145]";
  if (status === "draft") return "bg-[#f5ead7] text-[#8a6538]";
  return "bg-[#ecefe8] text-[#59685e]";
}

function daysUntil(value: string) {
  if (!value) return null;
  const target = new Date(`${value}T12:00:00`).getTime();
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.ceil((target - today.getTime()) / 86_400_000);
}

function TripCard({
  trip,
  checklistItems,
  reminders,
}: {
  trip: Trip;
  checklistItems: TravelChecklistItem[];
  reminders: Reminder[];
}) {
  const tripItems = checklistItems.filter((item) => item.tripId === trip.id);
  const remaining = tripItems.filter((item) => !item.completed).length;
  const progress = tripItems.length
    ? Math.round(((tripItems.length - remaining) / tripItems.length) * 100)
    : 0;
  const readiness = tripReadiness(trip, remaining, tripItems.length);
  const nextReminder = reminders.find(
    (reminder) =>
      trip.reminderIds.includes(reminder.id) && reminder.group !== "done",
  );
  const primaryTransport = trip.bookings.find(
    (booking) => booking.type !== "Accommodation",
  );
  const accommodation = trip.bookings.find(
    (booking) => booking.type === "Accommodation",
  );
  const nights = tripNights(trip);

  return (
    <Link
      href={`/driveway/trips/${trip.id}`}
      className="group block rounded-[24px] border border-[#20352a]/[0.07] bg-white/92 p-4 shadow-[0_20px_50px_-38px_rgba(32,53,42,0.5)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_55px_-36px_rgba(32,53,42,0.56)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] motion-reduce:transform-none"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#e8eee3] text-[#315b42]">
          <UiIcon name="map-pin" className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-start justify-between gap-2">
            <span className="min-w-0">
              <span className="block truncate font-serif text-xl text-[#20352a]">
                {trip.title}
              </span>
              <span className="mt-0.5 block truncate text-xs text-[#667068]">
                {tripDestination(trip)}
              </span>
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide ${statusTone(trip.status)}`}
            >
              {statusLabel(trip.status)}
            </span>
          </span>
          <span className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-[#667068]">
            <span className="inline-flex items-center gap-1.5">
              <UiIcon name="calendar" className="h-3.5 w-3.5" />
              {dateRange(trip)}
            </span>
            {nights ? (
              <span>
                {nights} night{nights === 1 ? "" : "s"}
              </span>
            ) : null}
            <span>{trip.tripType}</span>
          </span>
        </span>
        <UiIcon
          name="chevron-right"
          className="mt-4 h-4 w-4 shrink-0 text-[#667068] transition group-hover:translate-x-0.5 motion-reduce:transform-none"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4">
        <span className="rounded-[14px] bg-[#f4f4ee] px-3 py-2">
          <span className="block font-bold text-[#315b42]">
            {trip.travellerRecords.length || (trip.travellers ? 1 : 0)}
          </span>
          <span className="text-[#667068]">Travellers</span>
        </span>
        <span className="rounded-[14px] bg-[#f4f4ee] px-3 py-2">
          <span className="block font-bold text-[#315b42]">{progress}%</span>
          <span className="text-[#667068]">Checklist</span>
        </span>
        <span className="rounded-[14px] bg-[#f4f4ee] px-3 py-2">
          <span className="block truncate font-bold text-[#315b42]">
            {primaryTransport?.type ?? (trip.transport || "Not added")}
          </span>
          <span className="text-[#667068]">Transport</span>
        </span>
        <span className="rounded-[14px] bg-[#f4f4ee] px-3 py-2">
          <span className="block truncate font-bold text-[#315b42]">
            {accommodation?.provider ?? (trip.accommodation || "Not added")}
          </span>
          <span className="text-[#667068]">Stay</span>
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#20352a]/[0.06] pt-3">
        <span className="min-w-0 text-[10px] text-[#667068]">
          {nextReminder
            ? `Next: ${nextReminder.title}`
            : "No upcoming trip reminder"}
        </span>
        <span className="shrink-0 text-[10px] font-semibold text-[#52705a]">
          {readiness.ready} of {readiness.total} areas ready
        </span>
      </div>
    </Link>
  );
}

function EmptyTrips({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-[28px] border border-dashed border-[#6f8e72]/30 bg-[#eef2e9]/72 px-6 py-12 text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-white/90 text-[#52705a] shadow-sm">
        <UiIcon name="map-pin" className="h-7 w-7" />
      </span>
      <h2 className="mt-5 font-serif text-2xl text-[#20352a]">
        Your next adventure starts here
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667068]">
        Create a trip to organise its dates, travellers, bookings, checklist and
        important information in one calm place.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-5 min-h-12 rounded-full bg-[#2f5140] px-5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2"
      >
        Create your first trip
      </button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-semibold text-[#3c5145]">
      {label}
      {children}
    </label>
  );
}

function CreateTripWizard({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
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

  const set = <Key extends keyof TripDraft>(
    key: Key,
    value: TripDraft[Key],
  ) => {
    setError("");
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const validate = (final: boolean) => {
    if (!draft.title.trim()) return "Add a trip title before saving.";
    if (!final) return "";
    if (!draft.destinationCity.trim() || !draft.destinationCountry.trim())
      return "Add the destination city and country.";
    if (!draft.startDate || !draft.endDate)
      return "Add the departure and return dates.";
    if (draft.endDate < draft.startDate)
      return "The return date must be on or after the departure date.";
    return "";
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
      ...people
        .filter((person) => draft.travellerIds.includes(person.id))
        .map((person, index) => ({
          id: `traveller-${tripId}-${person.id}`,
          personId: person.id,
          source: "household" as const,
          displayName: person.name,
          travellerType: person.role.toLowerCase().includes("child")
            ? ("child" as const)
            : ("adult" as const),
          isLead: index === 0,
          passportRequired: false,
          passportStatus: "not-recorded" as const,
          visaStatus: "not-recorded" as const,
          accessibilityNotes: "",
          dietaryNotes: "",
          medicationNotes: "",
        })),
      ...contacts
        .filter((contact) => draft.contactIds.includes(contact.id))
        .map((contact) => ({
          id: `traveller-${tripId}-${contact.id}`,
          personId: contact.id,
          source: "contact" as const,
          displayName:
            `${contact.firstName} ${contact.lastName}`.trim() ||
            contact.company,
          travellerType: "adult" as const,
          isLead: false,
          passportRequired: false,
          passportStatus: "not-recorded" as const,
          visaStatus: "not-recorded" as const,
          accessibilityNotes: "",
          dietaryNotes: "",
          medicationNotes: "",
        })),
      ...draft.otherTravellers
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name, index) => ({
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
          medicationNotes: "",
        })),
    ];

    const bookings: TripBooking[] = [];
    if (
      draft.transportType ||
      draft.transportProvider ||
      draft.transportReference
    ) {
      bookings.push({
        id: `booking-${tripId}-transport`,
        type: (draft.transportType || "Other") as TripBooking["type"],
        title: draft.transportType || "Transport",
        provider: draft.transportProvider.trim(),
        bookingReference: draft.transportReference.trim(),
        status: "unknown",
        startAt: draft.startDate,
        endAt: "",
        timezone: draft.destinationTimezone,
        location: draft.destinationCity.trim(),
        address: "",
        amount: 0,
        currency: draft.currency,
        paymentStatus: "unpaid",
        cancellationDeadline: "",
        contactDetails: "",
        travellerIds: travellerRecords.map((item) => item.id),
        documentIds: [],
        notes: "",
        createdAt: now,
        updatedAt: now,
      });
    }
    if (
      draft.accommodationType ||
      draft.accommodationName ||
      draft.accommodationReference
    ) {
      bookings.push({
        id: `booking-${tripId}-stay`,
        type: "Accommodation",
        title: draft.accommodationType || "Accommodation",
        provider: draft.accommodationName.trim(),
        bookingReference: draft.accommodationReference.trim(),
        status: "unknown",
        startAt: draft.startDate,
        endAt: draft.endDate,
        timezone: draft.destinationTimezone,
        location: draft.destinationCity.trim(),
        address: "",
        amount: 0,
        currency: draft.currency,
        paymentStatus: "unpaid",
        cancellationDeadline: "",
        contactDetails: "",
        travellerIds: travellerRecords.map((item) => item.id),
        documentIds: [],
        notes: "",
        createdAt: now,
        updatedAt: now,
      });
    }

    const reminderId =
      draft.createReminder && draft.startDate
        ? `trip-start-${tripId}`
        : undefined;
    const trip: Trip = {
      id: tripId,
      title: draft.title.trim(),
      destination: [
        draft.destinationCity.trim(),
        draft.destinationCountry.trim(),
      ]
        .filter(Boolean)
        .join(", "),
      destinationCity: draft.destinationCity.trim(),
      destinationCountry: draft.destinationCountry.trim(),
      destinationTimezone: draft.destinationTimezone.trim() || "Europe/London",
      startDate: draft.startDate,
      endDate: draft.endDate,
      tripType: draft.tripType,
      currency: draft.currency,
      travellers: travellerRecords.map((item) => item.displayName).join(", "),
      transport: draft.transportProvider.trim() || draft.transportType,
      accommodation: draft.accommodationName.trim() || draft.accommodationType,
      bookingReference:
        draft.transportReference.trim() || draft.accommodationReference.trim(),
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
      updatedAt: now,
    };
    const checklist: TravelChecklistItem[] =
      draft.checklistTemplate === "none"
        ? []
        : templateItems[draft.checklistTemplate].map((item, index) => ({
            id: `travel-check-${tripId}-${index}`,
            tripId,
            label: item.label,
            category: item.category,
            completed: false,
            createdAt: now,
          }));
    const reminder: Reminder | undefined = reminderId
      ? {
          id: reminderId,
          title: `${trip.title} begins`,
          note: `Review travel plans for ${tripDestination(trip)}.`,
          roomId: "driveway",
          roomName: "Driveway",
          group: "later",
          timeLabel: formatDate(draft.startDate),
          dueDate: draft.startDate,
          priority: "normal",
        }
      : undefined;

    updateState((current) => ({
      ...current,
      trips: { trips: [trip, ...current.trips.trips] },
      travelChecklist: {
        items: [...current.travelChecklist.items, ...checklist],
      },
      reminders: reminder
        ? [
            reminder,
            ...current.reminders.filter((item) => item.id !== reminder.id),
          ]
        : current.reminders,
    }));
    if (reminder && repositoryMode === "supabase")
      await upsertStructuredReminder(reminder);
    close();
    router.push(`/driveway/trips/${tripId}`);
  };

  const steps = ["Details", "Travellers", "Transport", "Stay", "Set up"];
  return (
    <ModalShell
      open={open}
      title="Create a trip"
      subtitle={`Step ${step} of 5 · ${steps[step - 1]}`}
      onClose={close}
      footer={
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void save(true)}
              className="min-h-12 rounded-2xl border border-[#2f5140]/20 bg-white text-sm font-semibold text-[#2f5140]"
            >
              Save draft
            </button>
            {step < 5 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1) {
                    const message = validate(false);
                    if (message) {
                      setError(message);
                      return;
                    }
                  }
                  setStep((value) => Math.min(5, value + 1));
                }}
                className="min-h-12 rounded-2xl bg-[#2f5140] text-sm font-semibold text-white"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void save(false)}
                className="min-h-12 rounded-2xl bg-[#2f5140] text-sm font-semibold text-white"
              >
                Create trip
              </button>
            )}
          </div>
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((value) => Math.max(1, value - 1))}
              className="min-h-11 w-full text-xs font-semibold text-[#667068]"
            >
              Back
            </button>
          ) : null}
        </div>
      }
    >
      <div className="mb-5 flex gap-1" aria-label={`Step ${step} of 5`}>
        {steps.map((label, index) => (
          <span
            key={label}
            className={`h-1.5 flex-1 rounded-full ${index < step ? "bg-[#4f7655]" : "bg-[#e1e3dc]"}`}
          />
        ))}
      </div>
      {step === 1 ? (
        <div className="space-y-4">
          <Field label="Trip title *">
            <input
              value={draft.title}
              onChange={(event) => set("title", event.target.value)}
              placeholder="For example, Summer in Rome"
              className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal outline-none focus:border-[#6f8e72]"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Destination city">
              <input
                value={draft.destinationCity}
                onChange={(event) => set("destinationCity", event.target.value)}
                className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal outline-none focus:border-[#6f8e72]"
              />
            </Field>
            <Field label="Country">
              <input
                value={draft.destinationCountry}
                onChange={(event) =>
                  set("destinationCountry", event.target.value)
                }
                className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal outline-none focus:border-[#6f8e72]"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Departure">
              <input
                type="date"
                value={draft.startDate}
                onChange={(event) => set("startDate", event.target.value)}
                className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-2 text-sm font-normal"
              />
            </Field>
            <Field label="Return">
              <input
                type="date"
                value={draft.endDate}
                onChange={(event) => set("endDate", event.target.value)}
                min={draft.startDate}
                className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-2 text-sm font-normal"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Trip type">
              <select
                value={draft.tripType}
                onChange={(event) =>
                  set("tripType", event.target.value as TripType)
                }
                className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
              >
                {tripTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </Field>
            <Field label="Timezone">
              <input
                value={draft.destinationTimezone}
                onChange={(event) =>
                  set("destinationTimezone", event.target.value)
                }
                className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
              />
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              rows={3}
              value={draft.notes}
              onChange={(event) => set("notes", event.target.value)}
              className="mt-2 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 py-3 text-sm font-normal"
            />
          </Field>
        </div>
      ) : null}
      {step === 2 ? (
        <div className="space-y-4">
          <p className="text-xs leading-5 text-[#667068]">
            Link existing household members and contacts. DiaryDock does not
            copy their identity or health records into the trip.
          </p>
          {people.length ? (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-[#667068]">
                Household
              </h3>
              <div className="mt-2 space-y-2">
                {people.map((person) => (
                  <label
                    key={person.id}
                    className="flex min-h-12 items-center gap-3 rounded-2xl bg-white px-3"
                  >
                    <input
                      type="checkbox"
                      checked={draft.travellerIds.includes(person.id)}
                      onChange={() =>
                        set(
                          "travellerIds",
                          draft.travellerIds.includes(person.id)
                            ? draft.travellerIds.filter(
                                (id) => id !== person.id,
                              )
                            : [...draft.travellerIds, person.id],
                        )
                      }
                    />
                    <span className="text-sm font-medium">{person.name}</span>
                    <span className="ml-auto text-[10px] text-[#667068]">
                      {person.role}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          {contacts.length ? (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-[#667068]">
                Contacts
              </h3>
              <div className="mt-2 space-y-2">
                {contacts.map((contact) => (
                  <label
                    key={contact.id}
                    className="flex min-h-12 items-center gap-3 rounded-2xl bg-white px-3"
                  >
                    <input
                      type="checkbox"
                      checked={draft.contactIds.includes(contact.id)}
                      onChange={() =>
                        set(
                          "contactIds",
                          draft.contactIds.includes(contact.id)
                            ? draft.contactIds.filter((id) => id !== contact.id)
                            : [...draft.contactIds, contact.id],
                        )
                      }
                    />
                    <span className="text-sm font-medium">
                      {`${contact.firstName} ${contact.lastName}`.trim() ||
                        contact.company}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          <Field label="Other travellers">
            <input
              value={draft.otherTravellers}
              onChange={(event) => set("otherTravellers", event.target.value)}
              placeholder="Names separated by commas"
              className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
            />
          </Field>
        </div>
      ) : null}
      {step === 3 ? (
        <div className="space-y-4">
          <p className="text-xs leading-5 text-[#667068]">
            Transport is optional. Anything entered here remains unconfirmed
            until you set its status on the trip.
          </p>
          <Field label="Transport type">
            <select
              value={draft.transportType}
              onChange={(event) => set("transportType", event.target.value)}
              className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
            >
              <option value="">Skip for now</option>
              {[
                "Flight",
                "Train",
                "Ferry",
                "Car hire",
                "Transfer",
                "Other",
              ].map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </Field>
          <Field label="Provider">
            <input
              value={draft.transportProvider}
              onChange={(event) => set("transportProvider", event.target.value)}
              className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
            />
          </Field>
          <Field label="Booking reference">
            <input
              value={draft.transportReference}
              onChange={(event) =>
                set("transportReference", event.target.value)
              }
              className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
            />
          </Field>
        </div>
      ) : null}
      {step === 4 ? (
        <div className="space-y-4">
          <p className="text-xs leading-5 text-[#667068]">
            Accommodation is optional and will not be marked confirmed
            automatically.
          </p>
          <Field label="Accommodation type">
            <select
              value={draft.accommodationType}
              onChange={(event) => set("accommodationType", event.target.value)}
              className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
            >
              <option value="">Skip for now</option>
              {[
                "Hotel",
                "Apartment",
                "Villa",
                "Hostel",
                "Campsite",
                "Cruise cabin",
                "Staying with family or friends",
                "Other",
              ].map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </Field>
          <Field label="Name or provider">
            <input
              value={draft.accommodationName}
              onChange={(event) => set("accommodationName", event.target.value)}
              className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
            />
          </Field>
          <Field label="Booking reference">
            <input
              value={draft.accommodationReference}
              onChange={(event) =>
                set("accommodationReference", event.target.value)
              }
              className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
            />
          </Field>
        </div>
      ) : null}
      {step === 5 ? (
        <div className="space-y-4">
          <Field label="Checklist template">
            <select
              value={draft.checklistTemplate}
              onChange={(event) =>
                set(
                  "checklistTemplate",
                  event.target.value as TripDraft["checklistTemplate"],
                )
              }
              className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
            >
              <option value="none">Start with an empty checklist</option>
              <option value="city">City break</option>
              <option value="beach">Beach holiday</option>
              <option value="family">Family trip</option>
              <option value="business">Business trip</option>
            </select>
          </Field>
          <label className="flex min-h-14 items-center gap-3 rounded-2xl bg-white px-3">
            <input
              type="checkbox"
              checked={draft.createReminder}
              onChange={(event) => set("createReminder", event.target.checked)}
            />
            <span>
              <span className="block text-sm font-semibold">
                Trip start reminder
              </span>
              <span className="mt-0.5 block text-[10px] text-[#667068]">
                Creates one DiaryDock reminder linked to this trip.
              </span>
            </span>
          </label>
          <div className="rounded-2xl border border-[#d8dfd2] bg-[#eef2e9] p-4 text-xs leading-5 text-[#4f6256]">
            Documents, insurance, itinerary and sharing are available after the
            trip is created. External collaborator access is not granted until
            DiaryDock has server-enforced trip permissions.
          </div>
        </div>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-[#f8e7e2] px-3 py-2 text-xs font-medium text-[#8a5145]"
        >
          {error}
        </p>
      ) : null}
    </ModalShell>
  );
}

export function TripsWorkspace({
  createOnLoad = false,
}: {
  createOnLoad?: boolean;
}) {
  const { state, hydrated } = useDiaryDockData();
  const [createOpen, setCreateOpen] = useState(createOnLoad);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TripFilter>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | TripType>("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const today = new Date().toISOString().slice(0, 10);

  const visibleTrips = useMemo(
    () =>
      state.trips.trips.filter((trip) => {
        const haystack =
          `${trip.title} ${tripDestination(trip)} ${trip.travellerRecords.map((person) => person.displayName).join(" ")} ${trip.bookings.map((booking) => `${booking.provider} ${booking.title}`).join(" ")} ${trip.notes}`.toLowerCase();
        const matchesSearch = haystack.includes(query.trim().toLowerCase());
        const isPast =
          Boolean(trip.endDate && trip.endDate < today) ||
          trip.status === "completed" ||
          trip.status === "cancelled";
        const matchesFilter =
          filter === "all" ||
          (filter === "upcoming" &&
            !isPast &&
            trip.status !== "draft" &&
            trip.status !== "archived") ||
          (filter === "past" && isPast) ||
          (filter === "draft" && trip.status === "draft") ||
          (filter === "shared" &&
            trip.shares.some((share) => share.status === "accepted"));
        return (
          matchesSearch &&
          matchesFilter &&
          (typeFilter === "all" || trip.tripType === typeFilter) &&
          (countryFilter === "all" ||
            trip.destinationCountry === countryFilter) &&
          (yearFilter === "all" || trip.startDate.startsWith(yearFilter))
        );
      }),
    [
      countryFilter,
      filter,
      query,
      state.trips.trips,
      today,
      typeFilter,
      yearFilter,
    ],
  );

  const groups = useMemo(
    () => ({
      happening: visibleTrips.filter(
        (trip) =>
          trip.status === "happening" ||
          (trip.startDate <= today &&
            trip.endDate >= today &&
            trip.status !== "cancelled" &&
            trip.status !== "archived"),
      ),
      upcoming: visibleTrips.filter(
        (trip) =>
          trip.startDate > today &&
          !["draft", "archived", "cancelled", "completed"].includes(
            trip.status,
          ),
      ),
      drafts: visibleTrips.filter((trip) => trip.status === "draft"),
      past: visibleTrips.filter(
        (trip) =>
          (trip.endDate && trip.endDate < today) ||
          trip.status === "completed" ||
          trip.status === "cancelled",
      ),
      archived: visibleTrips.filter((trip) => trip.status === "archived"),
    }),
    [today, visibleTrips],
  );
  const countries = Array.from(
    new Set(
      state.trips.trips.map((trip) => trip.destinationCountry).filter(Boolean),
    ),
  ).sort();
  const years = Array.from(
    new Set(
      state.trips.trips
        .map((trip) => trip.startDate.slice(0, 4))
        .filter(Boolean),
    ),
  )
    .sort()
    .reverse();
  const nextTrip = [...state.trips.trips]
    .filter(
      (trip) =>
        trip.startDate >= today &&
        !["draft", "archived", "cancelled", "completed"].includes(trip.status),
    )
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  const tripsThisYear = state.trips.trips.filter((trip) =>
    trip.startDate.startsWith(today.slice(0, 4)),
  ).length;
  const checklistRemaining = state.travelChecklist.items.filter(
    (item) =>
      !item.completed &&
      state.trips.trips.some(
        (trip) => trip.id === item.tripId && trip.status !== "archived",
      ),
  ).length;
  const travelReminders = state.reminders.filter(
    (reminder) =>
      state.trips.trips.some((trip) =>
        trip.reminderIds.includes(reminder.id),
      ) && reminder.group !== "done",
  ).length;
  const documentsToReview = state.trips.trips
    .flatMap((trip) => trip.documentLinks)
    .filter(
      (link) =>
        state.vaultDocuments.find((document) => document.id === link.documentId)
          ?.reviewStatus === "needs-review",
    ).length;

  if (!hydrated)
    return (
      <main className="min-h-screen bg-[#f5f1e8] px-4 py-8">
        <div className="mx-auto max-w-[900px] animate-pulse space-y-4">
          <div className="h-16 rounded-3xl bg-white/70" />
          <div className="h-52 rounded-[28px] bg-white/70" />
          <div className="h-36 rounded-[28px] bg-white/70" />
        </div>
      </main>
    );

  const sections: Array<{
    key: keyof typeof groups;
    title: string;
    icon: IconName;
    description: string;
  }> = [
    {
      key: "happening",
      title: "Happening now",
      icon: "map-pin",
      description: "Trips currently in progress.",
    },
    {
      key: "upcoming",
      title: "Upcoming",
      icon: "calendar",
      description: "Journeys ahead.",
    },
    {
      key: "drafts",
      title: "Drafts",
      icon: "file",
      description: "Trips still being shaped.",
    },
    {
      key: "past",
      title: "Past trips",
      icon: "archive",
      description: "Completed and cancelled journeys.",
    },
    {
      key: "archived",
      title: "Archived",
      icon: "folder",
      description: "Trips kept out of the main view.",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f5f1e8] pb-32 text-[#20352a]">
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <span className="absolute -right-16 top-12 h-64 w-64 rounded-full bg-[#dfe7d8]/55 blur-3xl" />
        <span className="absolute -left-20 bottom-24 h-72 w-72 rounded-full bg-[#ead9c0]/45 blur-3xl" />
      </div>
      <div className="relative mx-auto w-full max-w-[1000px] px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <header className="flex items-start gap-3">
          <Link
            href="/room/driveway"
            aria-label="Back to Driveway"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#20352a]/10 bg-white/80 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
          >
            <UiIcon name="arrow-left" className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6f8e72]">
              Travel Room
            </p>
            <h1 className="font-serif text-3xl leading-tight tracking-tight">
              My Trips
            </h1>
            <p className="mt-1 text-xs text-[#667068]">
              Plan, organise and keep every journey in one place.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#2f5140] px-4 text-xs font-semibold text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2"
          >
            <UiIcon name="plus" className="h-4 w-4" />
            Add trip
          </button>
        </header>

        <section className="mt-6 rounded-[28px] bg-[#2f5140] p-5 text-white shadow-[0_24px_55px_-35px_rgba(32,53,42,0.65)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/65">
                Next journey
              </p>
              <h2 className="mt-2 font-serif text-2xl">
                {nextTrip?.title ?? "Your next adventure starts here"}
              </h2>
              <p className="mt-2 text-sm text-white/72">
                {nextTrip
                  ? `${tripDestination(nextTrip)} · ${dateRange(nextTrip)}`
                  : "Create a trip when you're ready to begin planning."}
              </p>
            </div>
            {nextTrip ? (
              <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold">
                {daysUntil(nextTrip.startDate)} days
              </span>
            ) : null}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { value: tripsThisYear, label: "Trips this year" },
              { value: checklistRemaining, label: "Checklist left" },
              { value: travelReminders, label: "Travel reminders" },
              { value: documentsToReview, label: "Docs to review" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/12 bg-white/[0.08] px-3 py-3"
              >
                <p className="text-xl font-semibold">{item.value}</p>
                <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/62">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-[22px] border border-[#20352a]/[0.07] bg-white/78 p-3 shadow-sm">
          <label className="relative block">
            <UiIcon
              name="search"
              className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#667068]"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search trips, travellers, bookings or notes"
              className="min-h-11 w-full rounded-[14px] border border-[#20352a]/10 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#6f8e72]"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              ["all", "upcoming", "past", "draft", "shared"] as TripFilter[]
            ).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`min-h-11 rounded-full px-4 text-xs font-semibold capitalize ${filter === item ? "bg-[#2f5140] text-white" : "bg-[#eef2e9] text-[#52705a]"}`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <select
              aria-label="Trip type"
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as "all" | TripType)
              }
              className="min-h-11 min-w-0 rounded-xl border border-[#20352a]/10 bg-white px-2 text-[10px]"
            >
              <option value="all">All trip types</option>
              {tripTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
            <select
              aria-label="Country"
              value={countryFilter}
              onChange={(event) => setCountryFilter(event.target.value)}
              className="min-h-11 min-w-0 rounded-xl border border-[#20352a]/10 bg-white px-2 text-[10px]"
            >
              <option value="all">All countries</option>
              {countries.map((country) => (
                <option key={country}>{country}</option>
              ))}
            </select>
            <select
              aria-label="Year"
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
              className="min-h-11 min-w-0 rounded-xl border border-[#20352a]/10 bg-white px-2 text-[10px]"
            >
              <option value="all">All years</option>
              {years.map((year) => (
                <option key={year}>{year}</option>
              ))}
            </select>
          </div>
        </section>

        <div className="mt-6 space-y-7">
          {state.trips.trips.length === 0 ? (
            <EmptyTrips onCreate={() => setCreateOpen(true)} />
          ) : (
            sections.map((section) =>
              groups[section.key].length ? (
                <section key={section.key}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#e4eadf] text-[#52705a]">
                      <UiIcon name={section.icon} className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="font-serif text-xl">{section.title}</h2>
                      <p className="text-[10px] text-[#667068]">
                        {section.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    {groups[section.key].map((trip) => (
                      <TripCard
                        key={trip.id}
                        trip={trip}
                        checklistItems={state.travelChecklist.items}
                        reminders={state.reminders}
                      />
                    ))}
                  </div>
                </section>
              ) : null,
            )
          )}
          {state.trips.trips.length > 0 && visibleTrips.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[#6f8e72]/30 bg-white/60 px-5 py-10 text-center text-sm text-[#667068]">
              No trips match these search and filter choices.
            </div>
          ) : null}
        </div>
      </div>
      <CreateTripWizard
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <BottomNav />
    </main>
  );
}
