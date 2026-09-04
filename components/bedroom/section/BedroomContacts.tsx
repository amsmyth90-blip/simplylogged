import Link from "next/link";

import { healthContactName } from "./bedroom-section-model";
import { HealthCard, HealthEmpty } from "./BedroomSectionUi";
import type { BedroomSectionController } from "./useBedroomSection";

export function BedroomContacts({
  bedroom,
}: {
  bedroom: BedroomSectionController;
}) {
  return (
    <HealthCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">Healthcare directory</h2>
          <p className="mt-1 text-xs text-[#667068]">
            These are reused from Professional Contacts, not duplicated.
          </p>
        </div>
        <Link
          href="/office/contacts/new"
          className="inline-flex min-h-11 items-center rounded-full bg-[#315443] px-4 text-xs font-semibold text-white"
        >
          Add contact
        </Link>
      </div>
      <div className="mt-4 space-y-2">
        {bedroom.healthContacts.length ? (
          bedroom.healthContacts.map((contact) => (
            <Link
              key={contact.id}
              href={`/office/contacts/${contact.id}`}
              className="block rounded-[18px] bg-[#f7f5ef] p-3"
            >
              <p className="text-sm font-semibold">
                {healthContactName(contact)}
              </p>
              <p className="mt-1 text-[10px] text-[#667068]">
                {[contact.role, contact.company, contact.phone]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </Link>
          ))
        ) : (
          <HealthEmpty
            icon="phone"
            title="No healthcare contacts linked"
            detail="Create or categorise a Healthcare contact in the existing Professional Contacts directory."
            action={
              <Link
                href="/office/contacts/new"
                className="inline-flex min-h-11 items-center rounded-full bg-[#315443] px-4 text-xs font-semibold text-white"
              >
                Add healthcare contact
              </Link>
            }
          />
        )}
      </div>
    </HealthCard>
  );
}
