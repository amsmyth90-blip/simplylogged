"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import type { ProfessionalContact } from "@/lib/professional-contact-records";

import { fullContactName } from "./contacts-shared";

type LinkKey =
  | "linkedDocumentIds"
  | "linkedPolicyIds"
  | "linkedContractIds"
  | "linkedBillIds";

export function useContactDetail(contactId: string) {
  const router = useRouter();
  const { state, updateState } = useDiaryDockData();
  const original = state.professionalContacts.contacts.find(
    (contact) => contact.id === contactId,
  );
  const [draft, setDraft] = useState(original);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
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
  const save = () => {
    if (draft)
      persist(
        { ...draft, updatedAt: new Date().toISOString() },
        "Contact saved.",
      );
  };
  const addNote = () => {
    if (!draft || !note.trim()) return;
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
      !draft ||
      !window.confirm(
        `Delete ${fullContactName(draft)} from Professional Contacts? Linked documents and records will not be deleted.`,
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
  const addLinked = (key: LinkKey, value: string) => {
    if (!draft || !value) return;
    update(key, Array.from(new Set([...draft[key], value])));
  };
  return {
    state,
    draft,
    note,
    message,
    setNote,
    update,
    save,
    addNote,
    remove,
    addLinked,
  };
}

export type ContactDetailController = ReturnType<typeof useContactDetail>;
