import type { TravelTrip } from "@diarydock/travel";

export function tripDestination(trip: TravelTrip) {
  return [trip.destinationCity, trip.destinationCountry].filter(Boolean).join(", ")
    || trip.destination || "Destination not added";
}

export function tripDate(value: string) {
  if (!value) return "Date not set";
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date)
    : "Date not set";
}

export function tripDateRange(trip: TravelTrip) {
  if (!trip.startDate) return "Dates not set";
  return trip.endDate && trip.endDate !== trip.startDate
    ? `${tripDate(trip.startDate)} – ${tripDate(trip.endDate)}` : tripDate(trip.startDate);
}

export function tripNights(trip: TravelTrip) {
  if (!trip.startDate || !trip.endDate) return 0;
  const start = new Date(`${trip.startDate}T12:00:00`).getTime();
  const end = new Date(`${trip.endDate}T12:00:00`).getTime();
  return end >= start ? Math.round((end - start) / 86_400_000) : 0;
}

export function tripStatus(status: TravelTrip["status"]) {
  return status === "happening" ? "In progress"
    : status[0]!.toUpperCase() + status.slice(1);
}

export function daysUntil(value: string) {
  if (!value) return null;
  const target = new Date(`${value}T12:00:00`).getTime();
  const today = new Date();
  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12).getTime();
  return Number.isFinite(target) ? Math.ceil((target - localToday) / 86_400_000) : null;
}
