"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  BillsCard,
  BillsHeader,
  BillsSectionTitle,
  BillsShell,
} from "@/components/bills/BillsUi";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import type { ProfessionalContact } from "@/lib/professional-contact-records";

import { ContactForm } from "./ContactForm";
import { ContactsNotice, emptyContact } from "./contacts-shared";

export function NewContact() {
  const router = useRouter();
  const { updateState } = useDiaryDockData();
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
