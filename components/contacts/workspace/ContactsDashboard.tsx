"use client";

import Link from "next/link";

import {
  BillsAction,
  BillsCard,
  BillsHeader,
  BillsSectionTitle,
  BillsShell,
} from "@/components/bills/BillsUi";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";

import { ContactRow, ContactsNotice, contactDateTime } from "./contacts-shared";

export function ContactsDashboard() {
  const { state, hydrated } = useDiaryDockData();
  const contacts = state.professionalContacts.contacts;
  const favourites = contacts.filter((contact) => contact.isFavourite);
  const upcoming = contacts
    .flatMap((contact) =>
      contact.meetings
        .filter(
          (meeting) =>
            !meeting.completed &&
            contactDateTime(meeting.date, meeting.time) >= Date.now(),
        )
        .map((meeting) => ({ contact, meeting })),
    )
    .sort(
      (a, b) =>
        contactDateTime(a.meeting.date, a.meeting.time) -
        contactDateTime(b.meeting.date, b.meeting.time),
    );
  const recent = [...contacts]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 5);
  const categoryCount = new Set(contacts.map((contact) => contact.category))
    .size;
  if (!hydrated)
    return (
      <BillsShell>
        <BillsCard>
          <p className="text-sm text-[#667068]">
            Opening professional contacts…
          </p>
        </BillsCard>
      </BillsShell>
    );
  const stats = [
    {
      icon: "users" as const,
      count: contacts.length,
      label: "Total contacts",
      tone: "bg-[#f7f7f1]",
      color: "text-[#52705a]",
    },
    {
      icon: "star" as const,
      count: favourites.length,
      label: "Favourites",
      tone: "bg-[#fbf0da]",
      color: "text-[#b58a2d]",
    },
    {
      icon: "calendar" as const,
      count: upcoming.length,
      label: "Upcoming reminders",
      tone: "bg-[#e9edf5]",
      color: "text-[#536a8c]",
    },
    {
      icon: "folder" as const,
      count: categoryCount,
      label: "Categories used",
      tone: "bg-[#e7efe3]",
      color: "text-[#49644d]",
    },
  ];
  return (
    <BillsShell>
      <BillsHeader
        title="Professional Contacts"
        subtitle="Keep key people, providers and advisers organised in one private place."
      />
      <BillsCard>
        <div className="grid grid-cols-2 gap-2.5">
          {stats.map((stat) => (
            <div key={stat.label} className={`rounded-[16px] p-3 ${stat.tone}`}>
              <UiIcon name={stat.icon} className={`h-4 w-4 ${stat.color}`} />
              <p className="mt-2 text-2xl font-semibold text-[#20352a]">
                {stat.count}
              </p>
              <p className="text-[11px] text-[#667068]">{stat.label}</p>
            </div>
          ))}
        </div>
      </BillsCard>
      <BillsCard>
        <div className="flex items-center justify-between gap-3">
          <BillsSectionTitle
            icon="users"
            title="Recent contacts"
            detail={
              recent.length
                ? "Professionals most recently updated"
                : "No professional contacts yet"
            }
          />
          <Link
            href="/office/contacts/directory"
            className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-[#52705a]"
          >
            View all
          </Link>
        </div>
        <div className="mt-4 space-y-2.5">
          {recent.length ? (
            recent.map((contact) => (
              <ContactRow key={contact.id} contact={contact} />
            ))
          ) : (
            <p className="rounded-[18px] bg-[#f6f5ef] px-4 py-7 text-center text-sm text-[#667068]">
              Add a professional contact or import a CSV file to begin your
              private directory.
            </p>
          )}
        </div>
        <Link
          href="/office/contacts/new"
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
        >
          <UiIcon name="plus" className="h-4 w-4" />
          Add contact
        </Link>
      </BillsCard>
      <div className="grid gap-3 sm:grid-cols-2">
        <BillsAction
          href="/office/contacts/directory"
          icon="folder"
          title="Categories & directory"
          detail="Search contacts by service or category"
          badge={`${contacts.length}`}
        />
        <BillsAction
          href="/office/contacts/new"
          icon="users"
          title="Add contact"
          detail="Create a new professional contact"
        />
        <BillsAction
          href="/office/contacts/import"
          icon="file"
          title="Import contacts"
          detail="Preview and import a CSV file"
        />
        <BillsAction
          href="/reminders"
          icon="calendar"
          title="Meeting reminders"
          detail="See upcoming contact reminders"
        />
      </div>
      <ContactsNotice />
    </BillsShell>
  );
}
