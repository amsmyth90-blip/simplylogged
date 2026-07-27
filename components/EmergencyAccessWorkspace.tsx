"use client";

import Link from "next/link";

import { useLifeDockData } from "@/components/LifeDockDataProvider";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { UiIcon } from "@/components/UiIcon";
import { quickDials } from "@/lib/mock-data";

export function EmergencyAccessWorkspace() {
  const { state } = useLifeDockData();
  const emergencyDocuments = state.vaultDocuments.filter((document) => document.emergencyVisible);

  return (
    <div className="immersive-page">
      <PageHeader
        eyebrow="Emergency access"
        title="Essential Help, Only"
        subtitle="A limited view for trusted people in a crisis."
        backHref="/emergency"
        backLabel="Emergency"
        heroImage="/images/pages/emergency-hero.png"
        heroPosition="center 44%"
        heroTone="linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(95,24,20,0.16) 44%, rgba(47,28,24,0.58) 100%)"
        badge="Limited view"
      />

      <section className="estate-sheet border-red-200/70 bg-red-50/72 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500 text-white">
            <UiIcon name="alert" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ink">Emergency mode is intentionally limited</h2>
            <p className="mt-1 text-sm leading-6 text-ink/60">
              This screen shows only emergency-approved information. Private Vault documents stay hidden unless you mark them visible.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Call first" hint="Fast dial cards for urgent help" />
        <div className="grid grid-cols-2 gap-3">
          {quickDials.map((dial) => (
            <a
              key={dial.id}
              href={`tel:${dial.number.replace(/\s/g, "")}`}
              className={`rounded-[24px] p-4 shadow-soft ${
                dial.tone === "danger" ? "bg-red-500 text-white" : "estate-sheet"
              }`}
            >
              <span className="block text-sm font-semibold">{dial.label}</span>
              <span className={`mt-1 block text-xs ${dial.tone === "danger" ? "text-white/78" : "text-ink/50"}`}>
                {dial.sub}
              </span>
              <span className="mt-3 block text-lg font-semibold tracking-tight">{dial.number}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Emergency documents" hint={`${emergencyDocuments.length} approved records`} />
        <div className="estate-sheet divide-y divide-white/60 overflow-hidden">
          {emergencyDocuments.length ? (
            emergencyDocuments.map((document) => (
              <Link
                key={document.id}
                href={`/document/${document.id}`}
                className="flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-white/45"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blush text-orange-700">
                  <UiIcon name="file" className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{document.title}</span>
                  <span className="mt-0.5 block truncate text-xs text-ink/50">
                    {document.category} {document.roomName ? `- ${document.roomName}` : ""}
                  </span>
                </span>
                <UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-ink/30" />
              </Link>
            ))
          ) : (
            <div className="px-4 py-5 text-sm text-ink/55">
              No documents are marked emergency-visible yet. Open a document and switch on Emergency Access Mode.
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Household plans" hint="Step-by-step emergency instructions" />
        <div className="space-y-3">
          {state.emergencyPlans.map((plan) => (
            <details key={plan.id} className="estate-sheet group overflow-hidden">
              <summary className="flex cursor-pointer list-none items-center gap-3.5 p-4 [&::-webkit-details-marker]:hidden">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blush text-orange-700">
                  <UiIcon name="shield" className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{plan.title}</span>
                  <span className="mt-0.5 block text-xs text-ink/50">{plan.summary}</span>
                </span>
                <UiIcon name="chevron-down" className="h-4 w-4 shrink-0 text-ink/30 transition-transform group-open:rotate-180" />
              </summary>
              <ol className="space-y-2.5 border-t border-white/60 px-4 pb-4 pt-3.5">
                {plan.steps.map((step, index) => (
                  <li key={`${plan.id}-${index}`} className="flex gap-3 text-sm leading-6 text-ink/70">
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
        <SectionHeader title="Home essentials" hint="Where to find important things" />
        <div className="estate-sheet grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
          {state.homeInfo.map((info) => (
            <div key={info.label}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/40">{info.label}</p>
              <p className="mt-1 text-sm font-medium text-ink">{info.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Trusted contacts" hint="People who can help" />
        <div className="estate-sheet divide-y divide-white/60 overflow-hidden">
          {state.careContacts.map((contact) => (
            <div key={contact.id} className="flex items-center gap-3.5 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{contact.name}</p>
                <p className="mt-0.5 text-xs text-ink/50">
                  {contact.relation} - {contact.detail}
                </p>
              </div>
              <a
                href={`tel:${contact.phone.replace(/\s/g, "")}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mist text-sky-700"
                aria-label={`Call ${contact.name}`}
              >
                <UiIcon name="phone" className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
