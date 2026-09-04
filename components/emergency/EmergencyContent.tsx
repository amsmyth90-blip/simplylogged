import Link from "next/link";

import { SectionHeader } from "@/components/SectionHeader";
import { UiIcon } from "@/components/UiIcon";
import type { EmergencyModalMode } from "@/components/emergency/emergency-model";
import type { DiaryDockAppState } from "@/lib/diarydock-data";
import { quickDials } from "@/lib/mock-data";

type EmergencyContentProps = {
  careContacts: DiaryDockAppState["careContacts"];
  contacts: DiaryDockAppState["emergencyContacts"];
  emergencyDocumentCount: number;
  notes: DiaryDockAppState["homeInfo"];
  onAdd: (mode: Exclude<EmergencyModalMode, null>) => void;
  plans: DiaryDockAppState["emergencyPlans"];
};

export function EmergencyContent({
  careContacts,
  contacts,
  emergencyDocumentCount,
  notes,
  onAdd,
  plans,
}: EmergencyContentProps) {
  return (
    <>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Dial cards", value: quickDials.length },
          { label: "Plans", value: plans.length },
          { label: "Contacts", value: contacts.length },
          { label: "Approved docs", value: emergencyDocumentCount },
        ].map((item) => (
          <article key={item.label} className="estate-sheet px-4 py-4">
            <p className="text-2xl font-semibold tracking-tight text-ink">
              {item.value}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink/40">
              {item.label}
            </p>
          </article>
        ))}
      </section>
      <section className="space-y-3">
        <SectionHeader title="Quick dial" hint="One tap to call" />
        <div className="grid grid-cols-2 gap-3">
          {quickDials.map((dial) => (
            <a
              key={dial.id}
              href={`tel:${dial.number.replace(/\s/g, "")}`}
              className={`flex flex-col gap-2 rounded-[24px] p-4 shadow-soft transition hover:-translate-y-0.5 ${dial.tone === "danger" ? "bg-red-500 text-white" : "estate-sheet"}`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full ${dial.tone === "danger" ? "bg-white/20 text-white" : "bg-mist text-sky-700"}`}
              >
                <UiIcon name="phone" className="h-4 w-4" />
              </span>
              <span>
                <span
                  className={`block text-sm font-semibold ${dial.tone === "danger" ? "text-white" : "text-ink"}`}
                >
                  {dial.label}
                </span>
                <span
                  className={`mt-0.5 block text-xs ${dial.tone === "danger" ? "text-white/80" : "text-ink/50"}`}
                >
                  {dial.sub}
                </span>
              </span>
              <span
                className={`text-lg font-semibold tracking-tight ${dial.tone === "danger" ? "text-white" : "text-ink"}`}
              >
                {dial.number}
              </span>
            </a>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <SectionAction
          title="Household plans"
          hint="Tap a plan to see the steps"
          label="Add plan"
          onClick={() => onAdd("plan")}
        />
        <div className="space-y-3">
          {plans.map((plan) => (
            <details
              key={plan.id}
              className="estate-sheet group overflow-hidden"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3.5 p-4 [&::-webkit-details-marker]:hidden">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blush text-orange-700">
                  <UiIcon name="alert" className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">
                    {plan.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink/50">
                    {plan.summary}
                  </span>
                </span>
                <span className="shrink-0 text-ink/30 transition-transform duration-200 group-open:rotate-180">
                  <UiIcon name="chevron-down" className="h-4 w-4" />
                </span>
              </summary>
              <ol className="space-y-2.5 border-t border-white/60 px-4 pb-4 pt-3.5">
                {plan.steps.map((step, index) => (
                  <li
                    key={`${plan.id}-${index}`}
                    className="flex gap-3 text-sm leading-6 text-ink/70"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mist text-[11px] font-bold text-ink/55">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </details>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <SectionAction
          title="Know your home"
          hint="Where things are when it matters"
          label="Add note"
          onClick={() => onAdd("note")}
        />
        <div className="estate-sheet grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
          {notes.map((info) => (
            <div key={info.label}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/40">
                {info.label}
              </p>
              <p className="mt-1 text-sm font-medium text-ink">{info.value}</p>
            </div>
          ))}
        </div>
      </section>
      <ContactList
        title="Care circle people"
        hint="Shared live with the Family page"
        contacts={careContacts}
      />
      <ContactList
        title="Emergency contacts"
        contacts={contacts}
        onAdd={() => onAdd("contact")}
      />
      <section className="estate-sheet flex items-center gap-3.5 p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-mist text-sky-700">
          <UiIcon name="lock" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            Manage trusted emergency access
          </p>
          <p className="mt-0.5 text-xs leading-5 text-ink/55">
            Choose a trusted person and share only specific approved items.
          </p>
        </div>
        <Link
          href="/emergency/access"
          className="shrink-0 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white shadow-soft transition hover:bg-ink/90"
        >
          Manage
        </Link>
      </section>
    </>
  );
}

function SectionAction({
  hint,
  label,
  onClick,
  title,
}: {
  hint?: string;
  label: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <SectionHeader title={title} hint={hint} />
      <button
        type="button"
        onClick={onClick}
        className="rounded-full border border-white/70 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-ink/70 shadow-soft transition hover:bg-white"
      >
        {label}
      </button>
    </div>
  );
}

type ContactItem = {
  id: string;
  name: string;
  relation: string;
  phone: string;
  note?: string;
  detail?: string;
};
function ContactList({
  contacts,
  hint,
  onAdd,
  title,
}: {
  contacts: ContactItem[];
  hint?: string;
  onAdd?: () => void;
  title: string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <SectionHeader
          title={title}
          hint={hint}
          actionLabel="Manage in Family"
          actionHref="/family"
        />
        {onAdd ? (
          <button
            type="button"
            onClick={onAdd}
            className="rounded-full border border-white/70 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-ink/70 shadow-soft transition hover:bg-white"
          >
            Add contact
          </button>
        ) : null}
      </div>
      <div className="estate-sheet divide-y divide-white/60 overflow-hidden">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="flex items-center gap-3.5 px-4 py-3.5"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-ink">
                  {contact.name}
                </p>
                <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-ink/50">
                  {contact.relation}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-ink/50">
                {contact.phone}
                {contact.detail
                  ? ` - ${contact.detail}`
                  : contact.note
                    ? ` - ${contact.note}`
                    : ""}
              </p>
            </div>
            <a
              href={`tel:${contact.phone.replace(/\s/g, "")}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mist text-sky-700 transition hover:bg-sky-100"
              aria-label={`Call ${contact.name}`}
            >
              <UiIcon name="phone" className="h-4 w-4" />
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
