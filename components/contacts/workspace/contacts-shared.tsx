"use client";

import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";
import type { ProfessionalContact } from "@/lib/professional-contact-records";

export type ContactsView =
  | "dashboard"
  | "directory"
  | "new"
  | "detail"
  | "meetings"
  | "import";

export function fullContactName(contact: ProfessionalContact) {
  return `${contact.firstName} ${contact.lastName}`.trim() || "Unnamed contact";
}

export function contactInitials(contact: ProfessionalContact) {
  return (
    `${contact.firstName[0] ?? ""}${contact.lastName[0] ?? ""}`.toUpperCase() ||
    "PC"
  );
}

export function contactDateTime(value: string, time = "12:00") {
  return value
    ? new Date(`${value}T${time || "12:00"}:00`).getTime()
    : Number.POSITIVE_INFINITY;
}

export function formatContactDate(value: string) {
  if (!value) return "Not recorded";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
}

export function safeContactPhone(value: string) {
  return value.replace(/[^+\d]/g, "");
}

export function safeContactEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? value.trim() : "";
}

export function emptyContact(
  partial: Partial<ProfessionalContact> = {},
): ProfessionalContact {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    firstName: "",
    lastName: "",
    role: "",
    company: "",
    category: "Other",
    phone: "",
    email: "",
    address: "",
    notes: "",
    isFavourite: false,
    isEmergencyContact: false,
    nextReviewDate: "",
    linkedDocumentIds: [],
    linkedPolicyIds: [],
    linkedContractIds: [],
    linkedBillIds: [],
    contactNotes: [],
    meetings: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function ContactsNotice() {
  return (
    <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[12px] leading-5 text-[#667068]">
      DiaryDock organises professional contact information and reminders. It
      does not provide legal, tax, medical or financial advice. Listing or
      linking a contact does not give them access to your DiaryDock information.
    </p>
  );
}

export function ContactRow({ contact }: { contact: ProfessionalContact }) {
  return (
    <Link
      href={`/office/contacts/${contact.id}`}
      className="flex min-h-[78px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] motion-reduce:transform-none"
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#dde6d8] text-sm font-semibold text-[#45604d]">
        {contactInitials(contact)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#20352a]">
          {fullContactName(contact)}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-[#667068]">
          {contact.role || contact.category}
          {contact.company ? ` · ${contact.company}` : ""}
        </span>
      </span>
      {contact.isEmergencyContact ? (
        <span className="rounded-full bg-[#f2ead6] px-2.5 py-1 text-[9px] font-semibold text-[#80683d]">
          Key contact
        </span>
      ) : contact.isFavourite ? (
        <UiIcon name="star" className="h-5 w-5 text-[#b58a2d]" />
      ) : (
        <UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" />
      )}
    </Link>
  );
}
