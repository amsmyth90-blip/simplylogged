"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import type { Reminder, VaultDocument } from "@/lib/mock-data";
import { upsertStructuredReminder } from "@/lib/structured-data";
import {
  emptyTripEmergencyInfo,
  tripDestination,
  tripReadiness,
  type Trip,
} from "@/lib/trip-records";
import type { TravelChecklistItem } from "@/lib/travel-checklist-records";

import { formatTripDate, type TripAddMode } from "./trip-detail-shared";

export function useTripDetailController(tripId: string) {
  const router = useRouter();
  const { state, updateState, hydrated, repositoryMode } = useDiaryDockData();
  const trip = state.trips.trips.find((item) => item.id === tripId);
  const [addMode, setAddMode] = useState<TripAddMode>(null);
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
  const remaining = tripChecklist.filter((item) => !item.completed).length;
  const readiness = trip
    ? tripReadiness(trip, remaining, tripChecklist.length)
    : { areas: [], ready: 0, total: 0, percent: 0 };
  const linkedDocuments = trip
    ? trip.documentLinks
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
        )
    : [];
  const linkedPolicy = state.insurance.policies.find(
    (policy) => policy.id === trip?.linkedInsurancePolicyId,
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
  const patchTrip = (changes: Partial<Trip>) => {
    if (trip)
      saveTrip({ ...trip, ...changes, updatedAt: new Date().toISOString() });
  };
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
    if (!trip) return;
    const reminder: Reminder = {
      id: `trip-review-${trip.id}`,
      title: `Review ${trip.title}`,
      note: `Check bookings, documents and checklist for ${tripDestination(trip)}.`,
      roomId: "driveway",
      roomName: "Driveway",
      group: "later",
      timeLabel: trip.startDate
        ? formatTripDate(trip.startDate)
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
    if (!trip) return;
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
    if (!trip) return;
    const text = [
      "DiaryDock Offline Trip Pack",
      trip.title,
      tripDestination(trip),
      `${formatTripDate(trip.startDate)} – ${formatTripDate(trip.endDate)}`,
      "",
      "Travellers",
      ...trip.travellerRecords.map((item) => `- ${item.displayName}`),
      "",
      "Itinerary",
      ...trip.itinerary.map(
        (item) =>
          `- ${formatTripDate(item.date)} ${item.startTime} ${item.title} ${item.location}`,
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

  return {
    state,
    updateState,
    hydrated,
    repositoryMode,
    router,
    trip,
    addMode,
    message,
    deleteOpen,
    emergencyDraft,
    notesDraft,
    tripChecklist,
    remaining,
    readiness,
    linkedDocuments,
    linkedPolicy,
    people,
    setAddMode,
    setMessage,
    setDeleteOpen,
    setEmergencyDraft,
    setNotesDraft,
    saveTrip,
    patchTrip,
    toggleChecklist,
    addReminder,
    duplicateTrip,
    downloadPack,
  };
}

export type TripDetailController = ReturnType<typeof useTripDetailController>;
