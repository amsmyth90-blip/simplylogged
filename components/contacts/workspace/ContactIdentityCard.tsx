"use client";

import Link from "next/link";

import { BillsCard } from "@/components/bills/BillsUi";
import { UiIcon } from "@/components/UiIcon";

import {
  contactInitials,
  fullContactName,
  safeContactEmail,
  safeContactPhone,
} from "./contacts-shared";
import type { ContactDetailController } from "./useContactDetail";

export function ContactIdentityCard({
  controller,
}: {
  controller: ContactDetailController;
}) {
  const { draft, update } = controller;
  if (!draft) return null;
  const email = safeContactEmail(draft.email);
  const phone = safeContactPhone(draft.phone);
  return (
    <BillsCard>
      <div className="flex items-center gap-4">
        <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#dde6d8] text-xl font-semibold text-[#45604d]">
          {contactInitials(draft)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-[#20352a]">
            {fullContactName(draft)}
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
  );
}
