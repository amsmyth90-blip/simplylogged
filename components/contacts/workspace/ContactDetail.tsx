"use client";

import {
  BillsCard,
  BillsHeader,
  BillsSectionTitle,
  BillsShell,
} from "@/components/bills/BillsUi";

import { ContactForm } from "./ContactForm";
import { ContactIdentityCard } from "./ContactIdentityCard";
import { ContactLinkedRecords } from "./ContactLinkedRecords";
import { ContactNotes } from "./ContactNotes";
import { ContactsNotice, fullContactName } from "./contacts-shared";
import { useContactDetail } from "./useContactDetail";

export function ContactDetail({ contactId }: { contactId: string }) {
  const controller = useContactDetail(contactId);
  const { draft, message, update, save, remove } = controller;
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
  return (
    <BillsShell>
      <BillsHeader
        title={fullContactName(draft)}
        subtitle={`${draft.role || draft.category}${draft.company ? ` · ${draft.company}` : ""}`}
        backHref="/office/contacts"
      />
      <ContactIdentityCard controller={controller} />
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
      <ContactLinkedRecords controller={controller} />
      <ContactNotes controller={controller} />
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
