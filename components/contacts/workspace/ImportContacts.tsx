"use client";

import { useState, type ChangeEvent } from "react";

import {
  BillsCard,
  BillsHeader,
  BillsSectionTitle,
  BillsShell,
} from "@/components/bills/BillsUi";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";

import { type CsvContactPreview, parseContactCsv } from "./contact-csv";
import {
  ContactsNotice,
  fullContactName,
  safeContactEmail,
} from "./contacts-shared";

export function ImportContacts() {
  const { state, updateState } = useDiaryDockData();
  const [preview, setPreview] = useState<CsvContactPreview[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const readCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setMessage("");
    try {
      setPreview(parseContactCsv(await file.text()));
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
          `${safeContactEmail(contact.email)}|${fullContactName(contact).toLowerCase()}|${contact.company.toLowerCase()}`,
      ),
    );
    const additions = preview
      .filter(
        (contact) =>
          !existingKeys.has(
            `${safeContactEmail(contact.email)}|${`${contact.firstName} ${contact.lastName}`.trim().toLowerCase()}|${contact.company.toLowerCase()}`,
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
