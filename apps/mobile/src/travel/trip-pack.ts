import { Share } from "@capacitor/share";

import type { TravelChecklistItem, TravelTrip } from "@diarydock/travel";

import { tripDate, tripDestination } from "./travel-format.ts";

export function buildTripPack(trip: TravelTrip, checklist: TravelChecklistItem[]) {
  return [
    "DiaryDock Offline Trip Pack",
    trip.title,
    tripDestination(trip),
    `${tripDate(trip.startDate)} – ${tripDate(trip.endDate)}`,
    "",
    "Travellers",
    ...trip.travellers.map((item) => `- ${item.displayName}`),
    "",
    "Itinerary",
    ...trip.itinerary.map((item) =>
      `- ${tripDate(item.date)} ${item.startTime} ${item.title} ${item.location}`),
    "",
    "Bookings",
    ...trip.bookings.map((item) =>
      `- ${item.title} · ${item.provider} · ${item.bookingReference}`),
    "",
    "Emergency contacts",
    trip.emergencyInfo.destinationEmergencyNumber,
    trip.emergencyInfo.localContact,
    "",
    "Checklist",
    ...checklist.map((item) => `- [${item.completed ? "x" : " "}] ${item.label}`),
    "",
    "Sensitive identity documents are excluded. Review all details before travel.",
  ].join("\n");
}

export async function shareTripPack(trip: TravelTrip, checklist: TravelChecklistItem[]) {
  await Share.share({
    title: `${trip.title} offline trip pack`,
    text: buildTripPack(trip, checklist),
    dialogTitle: "Share Offline Trip Pack",
  });
}
