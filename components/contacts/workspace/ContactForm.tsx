"use client";

import { fieldClass } from "@/components/bills/BillsUi";
import {
  professionalContactCategories,
  type ProfessionalContact,
  type ProfessionalContactCategory,
} from "@/lib/professional-contact-records";

export function ContactForm({
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
