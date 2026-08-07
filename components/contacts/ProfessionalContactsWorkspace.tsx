"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ChangeEvent } from "react";

import {
  BillsAction,
  BillsCard,
  BillsHeader,
  BillsSectionTitle,
  BillsShell,
  fieldClass,
} from "@/components/bills/BillsUi";
import { useLifeDockData } from "@/components/LifeDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import type { Reminder } from "@/lib/mock-data";
import {
  professionalContactCategories,
  type ProfessionalContact,
  type ProfessionalContactCategory,
  type ProfessionalContactMeeting,
} from "@/lib/professional-contact-records";
import { upsertStructuredReminder } from "@/lib/structured-data";

type ContactsView =
  | "dashboard"
  | "directory"
  | "new"
  | "detail"
  | "meetings"
  | "import";

function fullName(contact: ProfessionalContact) {
  return `${contact.firstName} ${contact.lastName}`.trim() || "Unnamed contact";
}
function initials(contact: ProfessionalContact) {
  return (
    `${contact.firstName[0] ?? ""}${contact.lastName[0] ?? ""}`.toUpperCase() ||
    "PC"
  );
}
function dateTime(value: string, time = "12:00") {
  return value
    ? new Date(`${value}T${time || "12:00"}:00`).getTime()
    : Number.POSITIVE_INFINITY;
}
function formatDate(value: string) {
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
function safePhone(value: string) {
  return value.replace(/[^+\d]/g, "");
}
function safeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? value.trim() : "";
}
function emptyContact(
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

function ContactsNotice() {
  return (
    <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[12px] leading-5 text-[#667068]">
      DiaryDock organises professional contact information and reminders. It
      does not provide legal, tax, medical or financial advice. Listing or
      linking a contact does not give them access to your DiaryDock information.
    </p>
  );
}

function ContactRow({ contact }: { contact: ProfessionalContact }) {
  return (
    <Link
      href={`/office/contacts/${contact.id}`}
      className="flex min-h-[78px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] motion-reduce:transform-none"
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#dde6d8] text-sm font-semibold text-[#45604d]">
        {initials(contact)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#20352a]">
          {fullName(contact)}
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

function Dashboard() {
  const { state, hydrated } = useLifeDockData();
  const contacts = state.professionalContacts.contacts;
  const favourites = contacts.filter((contact) => contact.isFavourite);
  const upcoming = contacts
    .flatMap((contact) =>
      contact.meetings
        .filter(
          (meeting) =>
            !meeting.completed &&
            dateTime(meeting.date, meeting.time) >= Date.now(),
        )
        .map((meeting) => ({ contact, meeting })),
    )
    .sort(
      (a, b) =>
        dateTime(a.meeting.date, a.meeting.time) -
        dateTime(b.meeting.date, b.meeting.time),
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
  return (
    <BillsShell>
      <BillsHeader
        title="Professional Contacts"
        subtitle="Keep key people, providers and advisers organised in one private place."
      />
      <BillsCard>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-[16px] bg-[#f7f7f1] p-3">
            <UiIcon name="users" className="h-4 w-4 text-[#52705a]" />
            <p className="mt-2 text-2xl font-semibold text-[#20352a]">
              {contacts.length}
            </p>
            <p className="text-[11px] text-[#667068]">Total contacts</p>
          </div>
          <div className="rounded-[16px] bg-[#fbf0da] p-3">
            <UiIcon name="star" className="h-4 w-4 text-[#b58a2d]" />
            <p className="mt-2 text-2xl font-semibold text-[#20352a]">
              {favourites.length}
            </p>
            <p className="text-[11px] text-[#667068]">Favourites</p>
          </div>
          <div className="rounded-[16px] bg-[#e9edf5] p-3">
            <UiIcon name="calendar" className="h-4 w-4 text-[#536a8c]" />
            <p className="mt-2 text-2xl font-semibold text-[#20352a]">
              {upcoming.length}
            </p>
            <p className="text-[11px] text-[#667068]">Upcoming reminders</p>
          </div>
          <div className="rounded-[16px] bg-[#e7efe3] p-3">
            <UiIcon name="folder" className="h-4 w-4 text-[#49644d]" />
            <p className="mt-2 text-2xl font-semibold text-[#20352a]">
              {categoryCount}
            </p>
            <p className="text-[11px] text-[#667068]">Categories used</p>
          </div>
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

function Directory() {
  const { state } = useLifeDockData();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const contacts = state.professionalContacts.contacts
    .filter(
      (contact) =>
        category === "All categories" || contact.category === category,
    )
    .filter((contact) => !favouritesOnly || contact.isFavourite)
    .filter((contact) =>
      `${fullName(contact)} ${contact.role} ${contact.company} ${contact.category}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort((a, b) => fullName(a).localeCompare(fullName(b)));
  const counts = useMemo(
    () =>
      professionalContactCategories.map((name) => ({
        name,
        count: state.professionalContacts.contacts.filter(
          (contact) => contact.category === name,
        ).length,
      })),
    [state.professionalContacts.contacts],
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

function ContactForm({
  contact,
  onChange,
}: {
  contact: ProfessionalContact;
  onChange: <K extends keyof ProfessionalContact>(
    key: K,
    value: ProfessionalContact[K],
  ) => void;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-[#667068]">
          First name
          <input
            value={contact.firstName}
            onChange={(event) => onChange("firstName", event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Last name
          <input
            value={contact.lastName}
            onChange={(event) => onChange("lastName", event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Role
          <input
            value={contact.role}
            onChange={(event) => onChange("role", event.target.value)}
            className={fieldClass}
            placeholder="Solicitor, financial adviser…"
          />
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Company
          <input
            value={contact.company}
            onChange={(event) => onChange("company", event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Category
          <select
            value={contact.category}
            onChange={(event) =>
              onChange(
                "category",
                event.target.value as ProfessionalContactCategory,
              )
            }
            className={fieldClass}
          >
            {professionalContactCategories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Next review
          <input
            type="date"
            value={contact.nextReviewDate}
            onChange={(event) => onChange("nextReviewDate", event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Phone
          <input
            value={contact.phone}
            onChange={(event) => onChange("phone", event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Email
          <input
            type="email"
            value={contact.email}
            onChange={(event) => onChange("email", event.target.value)}
            className={fieldClass}
          />
        </label>
      </div>
      <label className="mt-4 block text-xs font-semibold text-[#667068]">
        Address
        <textarea
          rows={3}
          value={contact.address}
          onChange={(event) => onChange("address", event.target.value)}
          className={fieldClass}
        />
      </label>
      <label className="mt-4 block text-xs font-semibold text-[#667068]">
        Notes
        <textarea
          rows={4}
          value={contact.notes}
          onChange={(event) => onChange("notes", event.target.value)}
          className={fieldClass}
        />
      </label>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <label className="flex min-h-11 items-center gap-3 rounded-[14px] border border-[#20352a]/10 bg-[#faf9f4] px-3 text-sm text-[#20352a]">
          <input
            type="checkbox"
            checked={contact.isFavourite}
            onChange={(event) => onChange("isFavourite", event.target.checked)}
            className="h-4 w-4 accent-[#45604d]"
          />
          Favourite
        </label>
        <label className="flex min-h-11 items-center gap-3 rounded-[14px] border border-[#20352a]/10 bg-[#faf9f4] px-3 text-sm text-[#20352a]">
          <input
            type="checkbox"
            checked={contact.isEmergencyContact}
            onChange={(event) =>
              onChange("isEmergencyContact", event.target.checked)
            }
            className="h-4 w-4 accent-[#45604d]"
          />
          Key emergency contact
        </label>
      </div>
      {contact.isEmergencyContact ? (
        <p className="mt-3 rounded-[14px] bg-[#f4ead7] px-3 py-2.5 text-xs leading-5 text-[#6f604a]">
          This improves visibility inside your account only. It does not grant
          this person access.
        </p>
      ) : null}
    </>
  );
}

function NewContact() {
  const router = useRouter();
  const { updateState } = useLifeDockData();
  const [draft, setDraft] = useState(() => emptyContact());
  const [error, setError] = useState("");
  const update = <K extends keyof ProfessionalContact>(
    key: K,
    value: ProfessionalContact[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));
  const save = () => {
    if (
      !draft.firstName.trim() &&
      !draft.lastName.trim() &&
      !draft.company.trim()
    ) {
      setError("Add a name or company before saving.");
      return;
    }
    const saved = { ...draft, updatedAt: new Date().toISOString() };
    updateState((current) => ({
      ...current,
      professionalContacts: {
        contacts: [saved, ...current.professionalContacts.contacts],
      },
    }));
    router.push(`/office/contacts/${saved.id}`);
  };
  return (
    <BillsShell>
      <BillsHeader
        title="Add Professional Contact"
        subtitle="Keep a useful private record of an adviser, provider or professional."
        backHref="/office/contacts"
      />
      <BillsCard>
        <BillsSectionTitle
          icon="users"
          title="Contact details"
          detail="Add only the information you need"
        />
        <div className="mt-5">
          <ContactForm contact={draft} onChange={update} />
        </div>
        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-[14px] bg-[#f7e4df] px-3 py-2.5 text-xs text-[#924a40]"
          >
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={save}
          className="mt-5 min-h-12 w-full rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
        >
          Save contact
        </button>
      </BillsCard>
      <ContactsNotice />
    </BillsShell>
  );
}

function ContactDetail({ contactId }: { contactId: string }) {
  const router = useRouter();
  const { state, updateState } = useLifeDockData();
  const original = state.professionalContacts.contacts.find(
    (contact) => contact.id === contactId,
  );
  const [draft, setDraft] = useState(original);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  if (!draft)
    return (
      <BillsShell>
        <BillsHeader
          title="Contact Not Found"
          subtitle="This contact is not available in your private directory."
          backHref="/office/contacts"
        />
      </BillsShell>
    );
  const update = <K extends keyof ProfessionalContact>(
    key: K,
    value: ProfessionalContact[K],
  ) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  const persist = (next: ProfessionalContact, success: string) => {
    setDraft(next);
    updateState((current) => ({
      ...current,
      professionalContacts: {
        contacts: current.professionalContacts.contacts.map((contact) =>
          contact.id === next.id ? next : contact,
        ),
      },
    }));
    setMessage(success);
  };
  const save = () =>
    persist(
      { ...draft, updatedAt: new Date().toISOString() },
      "Contact saved.",
    );
  const addNote = () => {
    if (!note.trim()) return;
    const now = new Date().toISOString();
    persist(
      {
        ...draft,
        contactNotes: [
          { id: crypto.randomUUID(), note: note.trim(), createdAt: now },
          ...draft.contactNotes,
        ],
        updatedAt: now,
      },
      "Note added.",
    );
    setNote("");
  };
  const remove = () => {
    if (
      !window.confirm(
        `Delete ${fullName(draft)} from Professional Contacts? Linked documents and records will not be deleted.`,
      )
    )
      return;
    updateState((current) => ({
      ...current,
      professionalContacts: {
        contacts: current.professionalContacts.contacts.filter(
          (contact) => contact.id !== draft.id,
        ),
      },
    }));
    router.push("/office/contacts");
  };
  const addLinked = (
    key:
      | "linkedDocumentIds"
      | "linkedPolicyIds"
      | "linkedContractIds"
      | "linkedBillIds",
    value: string,
  ) => {
    if (!value) return;
    update(key, Array.from(new Set([...draft[key], value])));
  };
  const email = safeEmail(draft.email);
  const phone = safePhone(draft.phone);
  return (
    <BillsShell>
      <BillsHeader
        title={fullName(draft)}
        subtitle={`${draft.role || draft.category}${draft.company ? ` · ${draft.company}` : ""}`}
        backHref="/office/contacts"
      />
      <BillsCard>
        <div className="flex items-center gap-4">
          <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#dde6d8] text-xl font-semibold text-[#45604d]">
            {initials(draft)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-[#20352a]">
              {fullName(draft)}
            </p>
            <p className="text-xs text-[#667068]">
              {draft.role || draft.category}
              {draft.company ? ` · ${draft.company}` : ""}
            </p>
          </div>
          <button
            type="button"
            aria-label={
              draft.isFavourite ? "Remove from favourites" : "Add to favourites"
            }
            onClick={() => update("isFavourite", !draft.isFavourite)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#f7f7f1] text-[#b58a2d]"
          >
            <UiIcon name="star" className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {phone ? (
            <a
              href={`tel:${phone}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] bg-[#eef2e9] text-xs font-semibold text-[#45604d]"
            >
              <UiIcon name="phone" className="h-4 w-4" />
              Call
            </a>
          ) : null}
          {email ? (
            <a
              href={`mailto:${email}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] bg-[#eef2e9] text-xs font-semibold text-[#45604d]"
            >
              <UiIcon name="mail" className="h-4 w-4" />
              Email
            </a>
          ) : null}
          <Link
            href={`/office/contacts/${draft.id}/meetings`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] bg-[#eef2e9] text-xs font-semibold text-[#45604d]"
          >
            <UiIcon name="calendar" className="h-4 w-4" />
            Meetings
          </Link>
        </div>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="users"
          title="Contact information"
          detail="Edit and review the details you rely on"
        />
        <div className="mt-5">
          <ContactForm contact={draft} onChange={update} />
        </div>
        <button
          type="button"
          onClick={save}
          className="mt-5 min-h-12 w-full rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
        >
          Save changes
        </button>
        {message ? (
          <p
            role="status"
            className="mt-3 text-xs font-semibold text-[#52705a]"
          >
            {message}
          </p>
        ) : null}
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="folder"
          title="Linked information"
          detail="Links organise records together; they do not change access permissions"
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[#667068]">
            Documents ({draft.linkedDocumentIds.length})
            <select
              defaultValue=""
              onChange={(event) => {
                addLinked("linkedDocumentIds", event.target.value);
                event.target.value = "";
              }}
              className={fieldClass}
            >
              <option value="">Link a document…</option>
              {state.vaultDocuments
                .filter((item) => !draft.linkedDocumentIds.includes(item.id))
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Policies ({draft.linkedPolicyIds.length})
            <select
              defaultValue=""
              onChange={(event) => {
                addLinked("linkedPolicyIds", event.target.value);
                event.target.value = "";
              }}
              className={fieldClass}
            >
              <option value="">Link a policy…</option>
              {state.insurance.policies
                .filter((item) => !draft.linkedPolicyIds.includes(item.id))
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title || item.provider}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Contracts ({draft.linkedContractIds.length})
            <select
              defaultValue=""
              onChange={(event) => {
                addLinked("linkedContractIds", event.target.value);
                event.target.value = "";
              }}
              className={fieldClass}
            >
              <option value="">Link a contract…</option>
              {state.contracts.contracts
                .filter((item) => !draft.linkedContractIds.includes(item.id))
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.serviceName || item.provider}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Bills ({draft.linkedBillIds.length})
            <select
              defaultValue=""
              onChange={(event) => {
                addLinked("linkedBillIds", event.target.value);
                event.target.value = "";
              }}
              className={fieldClass}
            >
              <option value="">Link a bill…</option>
              {state.bills.bills
                .filter((item) => !draft.linkedBillIds.includes(item.id))
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title || item.provider}
                  </option>
                ))}
            </select>
          </label>
        </div>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="file"
          title="Contact notes"
          detail="A dated record of useful conversations and context"
        />
        <div className="mt-4 flex gap-2">
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className={fieldClass}
            placeholder="Add a note…"
          />
          <button
            type="button"
            onClick={addNote}
            className="mt-1.5 min-h-11 rounded-[14px] border border-[#6f8e72]/35 px-4 text-xs font-semibold text-[#45604d]"
          >
            Add
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {draft.contactNotes.map((entry) => (
            <div
              key={entry.id}
              className="rounded-[14px] bg-[#f7f7f1] px-3 py-3 text-xs"
            >
              <p className="text-[#20352a]">{entry.note}</p>
              <p className="mt-1 text-[10px] text-[#667068]">
                {new Intl.DateTimeFormat("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(entry.createdAt))}
              </p>
            </div>
          ))}
        </div>
      </BillsCard>
      <button
        type="button"
        onClick={remove}
        className="min-h-11 w-full rounded-[14px] border border-[#b46b60]/30 text-xs font-semibold text-[#924a40]"
      >
        Delete contact
      </button>
      <ContactsNotice />
    </BillsShell>
  );
}

function Meetings({ contactId }: { contactId: string }) {
  const { state, updateState } = useLifeDockData();
  const contact = state.professionalContacts.contacts.find(
    (item) => item.id === contactId,
  );
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  if (!contact)
    return (
      <BillsShell>
        <BillsHeader
          title="Contact Not Found"
          subtitle="This contact is not available."
          backHref="/office/contacts"
        />
      </BillsShell>
    );
  const upcoming = [...contact.meetings]
    .filter(
      (meeting) =>
        !meeting.completed &&
        dateTime(meeting.date, meeting.time) >= Date.now(),
    )
    .sort((a, b) => dateTime(a.date, a.time) - dateTime(b.date, b.time));
  const history = [...contact.meetings]
    .filter(
      (meeting) =>
        meeting.completed || dateTime(meeting.date, meeting.time) < Date.now(),
    )
    .sort((a, b) => dateTime(b.date, b.time) - dateTime(a.date, a.time));
  const updateMeeting = (meetingId: string, completed: boolean) =>
    updateState((current) => ({
      ...current,
      professionalContacts: {
        contacts: current.professionalContacts.contacts.map((item) =>
          item.id === contact.id
            ? {
                ...item,
                meetings: item.meetings.map((meeting) =>
                  meeting.id === meetingId
                    ? { ...meeting, completed }
                    : meeting,
                ),
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      },
    }));
  const addMeeting = async () => {
    if (!title.trim() || !date) {
      setMessage("Add a meeting title and date.");
      return;
    }
    const now = new Date().toISOString();
    const meeting: ProfessionalContactMeeting = {
      id: crypto.randomUUID(),
      title: title.trim(),
      date,
      time,
      notes: notes.trim(),
      completed: false,
      createdAt: now,
    };
    const reminder: Reminder = {
      id: `contact-meeting-${meeting.id}`,
      title: `${meeting.title} · ${fullName(contact)}`,
      note:
        meeting.notes ||
        `${contact.role || contact.category}${contact.company ? ` at ${contact.company}` : ""}`,
      roomId: "office",
      roomName: "Office",
      group: "later",
      timeLabel: `${formatDate(date)}${time ? `, ${time}` : ""}`,
      priority: "normal",
      dueDate: date,
    };
    updateState((current) => ({
      ...current,
      reminders: [reminder, ...current.reminders],
      professionalContacts: {
        contacts: current.professionalContacts.contacts.map((item) =>
          item.id === contact.id
            ? { ...item, meetings: [meeting, ...item.meetings], updatedAt: now }
            : item,
        ),
      },
    }));
    await upsertStructuredReminder(reminder);
    setTitle("");
    setDate("");
    setTime("");
    setNotes("");
    setMessage("Meeting and reminder added.");
  };
  const meetingRows = (meetings: ProfessionalContactMeeting[]) =>
    meetings.length ? (
      meetings.map((meeting) => (
        <label
          key={meeting.id}
          className="flex min-h-[66px] items-center gap-3 rounded-[16px] bg-[#f7f7f1] px-3"
        >
          <input
            type="checkbox"
            checked={meeting.completed}
            onChange={(event) =>
              updateMeeting(meeting.id, event.target.checked)
            }
            className="h-4 w-4 accent-[#45604d]"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-[#20352a]">
              {meeting.title}
            </span>
            <span className="mt-0.5 block text-[11px] text-[#667068]">
              {formatDate(meeting.date)}
              {meeting.time ? ` · ${meeting.time}` : ""}
            </span>
          </span>
        </label>
      ))
    ) : (
      <p className="rounded-[14px] bg-[#f7f7f1] px-3 py-4 text-center text-xs text-[#667068]">
        None recorded.
      </p>
    );
  return (
    <BillsShell>
      <BillsHeader
        title="Meetings & Linked Information"
        subtitle={`Meetings, calls and review reminders for ${fullName(contact)}.`}
        backHref={`/office/contacts/${contact.id}`}
      />
      <BillsCard>
        <BillsSectionTitle
          icon="calendar"
          title="Add meeting or call"
          detail="A matching reminder will be added to DiaryDock"
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[#667068] sm:col-span-2">
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={fieldClass}
              placeholder="Policy review, annual meeting…"
            />
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Date
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Time
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068] sm:col-span-2">
            Notes
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={fieldClass}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => void addMeeting()}
          className="mt-4 min-h-12 w-full rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
        >
          Add meeting and reminder
        </button>
        {message ? (
          <p
            role="status"
            className="mt-3 text-xs font-semibold text-[#52705a]"
          >
            {message}
          </p>
        ) : null}
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="calendar"
          title="Upcoming"
          detail={`${upcoming.length} meeting${upcoming.length === 1 ? "" : "s"}`}
        />
        <div className="mt-4 space-y-2">{meetingRows(upcoming)}</div>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="clock"
          title="Contact history"
          detail={`${history.length} completed or past item${history.length === 1 ? "" : "s"}`}
        />
        <div className="mt-4 space-y-2">{meetingRows(history)}</div>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="folder"
          title="Linked information"
          detail="Records connected to this professional"
        />
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-[14px] bg-[#f7f7f1] p-3">
            <p className="text-xl font-semibold text-[#20352a]">
              {contact.linkedDocumentIds.length}
            </p>
            <p className="text-[10px] text-[#667068]">Documents</p>
          </div>
          <div className="rounded-[14px] bg-[#f7f7f1] p-3">
            <p className="text-xl font-semibold text-[#20352a]">
              {contact.linkedPolicyIds.length +
                contact.linkedContractIds.length}
            </p>
            <p className="text-[10px] text-[#667068]">Policies & contracts</p>
          </div>
          <div className="col-span-2 rounded-[14px] bg-[#f7f7f1] p-3">
            <p className="text-xl font-semibold text-[#20352a]">
              {contact.linkedBillIds.length}
            </p>
            <p className="text-[10px] text-[#667068]">Bills & accounts</p>
          </div>
        </div>
      </BillsCard>
      <ContactsNotice />
    </BillsShell>
  );
}

type CsvPreview = Omit<ProfessionalContact, "id" | "createdAt" | "updatedAt">;
function normaliseHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}
function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else current += char;
  }
  cells.push(current.trim());
  return cells;
}
function categoryFromCsv(value: string): ProfessionalContactCategory {
  return (
    professionalContactCategories.find(
      (category) => category.toLowerCase() === value.trim().toLowerCase(),
    ) ?? "Other"
  );
}

function ImportContacts() {
  const { state, updateState } = useLifeDockData();
  const [preview, setPreview] = useState<CsvPreview[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const readCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setMessage("");
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((line) => line.trim());
      if (lines.length < 2)
        throw new Error(
          "The CSV file needs a header row and at least one contact.",
        );
      const headers = parseCsvLine(lines[0]).map(normaliseHeader);
      const rows = lines
        .slice(1, 101)
        .map((line) => {
          const values = parseCsvLine(line);
          const row = Object.fromEntries(
            headers.map((header, index) => [header, values[index] ?? ""]),
          ) as Record<string, string>;
          const combinedName = row.name?.trim() ?? "";
          const parts = combinedName.split(/\s+/);
          return {
            firstName:
              row.firstname || row.givenname || (combinedName ? parts[0] : ""),
            lastName:
              row.lastname ||
              row.surname ||
              (combinedName ? parts.slice(1).join(" ") : ""),
            role: row.role || row.jobtitle || "",
            company: row.company || row.organisation || row.organization || "",
            category: categoryFromCsv(row.category || ""),
            phone: row.phone || row.telephone || row.mobile || "",
            email: row.email || "",
            address: row.address || "",
            notes: row.notes || "",
            isFavourite: false,
            isEmergencyContact: false,
            nextReviewDate: "",
            linkedDocumentIds: [],
            linkedPolicyIds: [],
            linkedContractIds: [],
            linkedBillIds: [],
            contactNotes: [],
            meetings: [],
          };
        })
        .filter(
          (contact) => contact.firstName || contact.lastName || contact.company,
        );
      if (!rows.length)
        throw new Error("No contacts could be read from this CSV file.");
      setPreview(rows);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to read this CSV file.",
      );
      setPreview([]);
    }
  };
  const importRows = () => {
    const now = new Date().toISOString();
    const existingKeys = new Set(
      state.professionalContacts.contacts.map(
        (contact) =>
          `${safeEmail(contact.email)}|${fullName(contact).toLowerCase()}|${contact.company.toLowerCase()}`,
      ),
    );
    const additions = preview
      .filter(
        (contact) =>
          !existingKeys.has(
            `${safeEmail(contact.email)}|${`${contact.firstName} ${contact.lastName}`.trim().toLowerCase()}|${contact.company.toLowerCase()}`,
          ),
      )
      .map((contact) => ({
        ...contact,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      }));
    updateState((current) => ({
      ...current,
      professionalContacts: {
        contacts: [...additions, ...current.professionalContacts.contacts],
      },
    }));
    setMessage(
      `${additions.length} contact${additions.length === 1 ? "" : "s"} imported. Duplicates were skipped.`,
    );
    setPreview([]);
  };
  return (
    <BillsShell>
      <BillsHeader
        title="Import Contacts"
        subtitle="Import professional contacts from a CSV file after reviewing them."
        backHref="/office/contacts"
      />
      <BillsCard>
        <BillsSectionTitle
          icon="file"
          title="Choose a CSV file"
          detail="Processed locally in your browser · up to 100 rows"
        />
        <p className="mt-4 text-xs leading-5 text-[#667068]">
          Supported headings include Name, First Name, Last Name, Role, Company,
          Category, Phone, Email, Address and Notes.
        </p>
        <label className="mt-4 flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-[20px] border border-dashed border-[#6f8e72]/45 bg-[#f7f7f1] px-5 text-center">
          <UiIcon name="plus" className="h-6 w-6 text-[#52705a]" />
          <span className="mt-2 text-sm font-semibold text-[#20352a]">
            Choose CSV file
          </span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => void readCsv(event)}
          />
        </label>
        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-[14px] bg-[#f7e4df] px-3 py-2.5 text-xs text-[#924a40]"
          >
            {error}
          </p>
        ) : null}
      </BillsCard>
      {preview.length ? (
        <BillsCard>
          <BillsSectionTitle
            icon="users"
            title="Review before importing"
            detail={`${preview.length} contact${preview.length === 1 ? "" : "s"} found`}
          />
          <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
            {preview.map((contact, index) => (
              <div
                key={`${contact.email}-${index}`}
                className="rounded-[14px] bg-[#f7f7f1] px-3 py-3"
              >
                <p className="text-sm font-semibold text-[#20352a]">
                  {`${contact.firstName} ${contact.lastName}`.trim() ||
                    contact.company}
                </p>
                <p className="mt-0.5 text-[11px] text-[#667068]">
                  {contact.role || contact.category}
                  {contact.company ? ` · ${contact.company}` : ""}
                </p>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={importRows}
            className="mt-4 min-h-12 w-full rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
          >
            Import reviewed contacts
          </button>
        </BillsCard>
      ) : null}
      {message ? (
        <p
          role="status"
          className="rounded-[18px] bg-[#e7efe3] px-4 py-3 text-sm font-semibold text-[#45604d]"
        >
          {message}
        </p>
      ) : null}
      <ContactsNotice />
    </BillsShell>
  );
}

export function ProfessionalContactsWorkspace({
  view,
  contactId,
}: {
  view: ContactsView;
  contactId?: string;
}) {
  if (view === "directory") return <Directory />;
  if (view === "new") return <NewContact />;
  if (view === "import") return <ImportContacts />;
  if (view === "detail" && contactId)
    return <ContactDetail contactId={contactId} />;
  if (view === "meetings" && contactId)
    return <Meetings contactId={contactId} />;
  return <Dashboard />;
}
