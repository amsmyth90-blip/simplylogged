"use client";

import Link from "next/link";
import { UiIcon, type IconName } from "@/components/UiIcon";
import type {
  Trip,
  TripBookingType,
  TripExpenseCategory,
  TripItineraryType,
  TripStatus,
} from "@/lib/trip-records";

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
export type TripAddMode =
  | "booking"
  | "itinerary"
  | "expense"
  | "traveller"
  | "document"
  | null;

export const sectionDetails: Record<
  TripSection,
  { label: string; icon: IconName }
> = {
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
export const bookingTypes: TripBookingType[] = [
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
export const itineraryTypes: TripItineraryType[] = [
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
export const expenseCategories: TripExpenseCategory[] = [
  "Accommodation",
  "Transport",
  "Food",
  "Activities",
  "Shopping",
  "Insurance",
  "Other",
];

export function formatTripDate(value: string) {
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
export function formatTripMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    }).format(amount || 0);
  } catch {
    return `${currency} ${(amount || 0).toFixed(2)}`;
  }
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
    archived: "Archived",
  };
  return labels[status];
}
export function tripCountdownLabel(trip: Trip) {
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
export function SectionHeading({
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
export function EmptySection({
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
export function DetailCard({
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
