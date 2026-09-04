import type { IconName } from "@/components/UiIcon";
import {
  type Trip,
  type TripStatus,
  type TripType
} from "@/lib/trip-records";
import type { TravelChecklistCategory } from "@/lib/travel-checklist-records";

export type TripFilter = "all" | "upcoming" | "past" | "draft" | "shared";

export type TripDraft = {
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

export const blankTrip: TripDraft = {
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
  createReminder: true
};

export const tripTemplateItems: Record<
  Exclude<TripDraft["checklistTemplate"], "none">,
  Array<{ label: string; category: TravelChecklistCategory }>
> = {
  city: [
    { label: "Passport or travel ID", category: "Documents" },
    { label: "Accommodation confirmation", category: "Documents" },
    { label: "Comfortable walking shoes", category: "Clothes" },
    { label: "Offline city map", category: "Tech" }
  ],
  beach: [
    { label: "Travel documents", category: "Documents" },
    { label: "Swimwear", category: "Clothes" },
    { label: "Sun cream", category: "Toiletries" },
    { label: "Sun hat", category: "Essentials" }
  ],
  family: [
    { label: "Family travel documents", category: "Documents" },
    { label: "Medicines", category: "Medications" },
    { label: "Journey snacks", category: "Travel day" },
    { label: "Children's entertainment", category: "Essentials" }
  ],
  business: [
    { label: "Meeting documents", category: "Documents" },
    { label: "Business clothes", category: "Clothes" },
    { label: "Laptop charger", category: "Tech" },
    { label: "Travel adapter", category: "Tech" }
  ]
};

export function formatTripDate(value: string) {
  if (!value) return "Date not added";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function tripDateRange(trip: Trip) {
  if (!trip.startDate && !trip.endDate) return "Dates not added";
  if (!trip.endDate || trip.endDate === trip.startDate) return formatTripDate(trip.startDate);
  return `${formatTripDate(trip.startDate)} – ${formatTripDate(trip.endDate)}`;
}

export function tripStatusLabel(status: TripStatus) {
  const labels: Record<TripStatus, string> = {
    draft: "Draft",
    planning: "Planning",
    booked: "Booked",
    ready: "Ready to travel",
    happening: "Happening now",
    completed: "Completed",
    cancelled: "Cancelled",
    archived: "Archived"
  };
  return labels[status];
}

export function tripStatusTone(status: TripStatus) {
  if (status === "happening" || status === "ready") return "bg-[#dfead9] text-[#315b42]";
  if (status === "cancelled") return "bg-[#f5e4df] text-[#8a5145]";
  if (status === "draft") return "bg-[#f5ead7] text-[#8a6538]";
  return "bg-[#ecefe8] text-[#59685e]";
}

export function daysUntilTrip(value: string) {
  if (!value) return null;
  const target = new Date(`${value}T12:00:00`).getTime();
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.ceil((target - today.getTime()) / 86_400_000);
}

export const tripSections: Array<{
  key: "happening" | "upcoming" | "drafts" | "past" | "archived";
  title: string;
  icon: IconName;
  description: string;
}> = [
  { key: "happening", title: "Happening now", icon: "map-pin", description: "Trips currently in progress." },
  { key: "upcoming", title: "Upcoming", icon: "calendar", description: "Journeys ahead." },
  { key: "drafts", title: "Drafts", icon: "file", description: "Trips still being shaped." },
  { key: "past", title: "Past trips", icon: "archive", description: "Completed and cancelled journeys." },
  { key: "archived", title: "Archived", icon: "folder", description: "Trips kept out of the main view." }
];

export const tripFieldClass = "mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal outline-none focus:border-[#6f8e72]";
