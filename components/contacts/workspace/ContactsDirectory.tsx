"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  BillsCard,
  BillsHeader,
  BillsShell,
  fieldClass,
} from "@/components/bills/BillsUi";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import { professionalContactCategories } from "@/lib/professional-contact-records";

import { ContactRow, ContactsNotice, fullContactName } from "./contacts-shared";

export function ContactsDirectory() {
  const { state } = useDiaryDockData();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const allContacts = state.professionalContacts.contacts;
  const contacts = allContacts
    .filter(
      (contact) =>
        category === "All categories" || contact.category === category,
    )
    .filter((contact) => !favouritesOnly || contact.isFavourite)
    .filter((contact) =>
      `${fullContactName(contact)} ${contact.role} ${contact.company} ${contact.category}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort((a, b) => fullContactName(a).localeCompare(fullContactName(b)));
  const counts = useMemo(
    () =>
      professionalContactCategories.map((name) => ({
        name,
        count: allContacts.filter((contact) => contact.category === name)
          .length,
      })),
    [allContacts],
  );
  return (
    <BillsShell>
      <BillsHeader
        title="Categories & Directory"
        subtitle="Find professional contacts by name, company, role or category."
        backHref="/office/contacts"
      />
      <BillsCard>
        <label className="text-xs font-semibold text-[#667068]">
          Search contacts
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={fieldClass}
            placeholder="Name, role, company or category"
          />
        </label>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {counts.map((entry) => (
            <button
              key={entry.name}
              type="button"
              onClick={() => setCategory(entry.name)}
              className={`min-h-[62px] rounded-[14px] px-3 text-left text-xs ${category === entry.name ? "bg-[#355540] text-white" : "bg-[#f6f5ef] text-[#20352a]"}`}
            >
              <span className="block font-semibold">{entry.name}</span>
              <span
                className={`mt-1 block text-[10px] ${category === entry.name ? "text-white/70" : "text-[#667068]"}`}
              >
                {entry.count} contact{entry.count === 1 ? "" : "s"}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setCategory("All categories")}
          className="mt-3 min-h-11 w-full rounded-[14px] border border-[#6f8e72]/25 text-xs font-semibold text-[#52705a]"
        >
          Show all categories
        </button>
        <label className="mt-3 flex min-h-11 items-center gap-3 rounded-[14px] border border-[#20352a]/10 bg-[#faf9f4] px-3 text-sm text-[#20352a]">
          <input
            type="checkbox"
            checked={favouritesOnly}
            onChange={(event) => setFavouritesOnly(event.target.checked)}
            className="h-4 w-4 accent-[#45604d]"
          />
          Favourites only
        </label>
      </BillsCard>
      <div className="space-y-3">
        {contacts.length ? (
          contacts.map((contact) => (
            <ContactRow key={contact.id} contact={contact} />
          ))
        ) : (
          <BillsCard>
            <p className="text-center text-sm text-[#667068]">
              No contacts match this view.
            </p>
          </BillsCard>
        )}
      </div>
      <Link
        href="/office/contacts/new"
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
      >
        <UiIcon name="plus" className="h-4 w-4" />
        Add contact
      </Link>
      <ContactsNotice />
    </BillsShell>
  );
}
