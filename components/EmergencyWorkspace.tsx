"use client";

import Link from "next/link";
import { useState } from "react";

import { useLifeDockData } from "@/components/LifeDockDataProvider";
import { ModalShell } from "@/components/ModalShell";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { UiIcon } from "@/components/UiIcon";
import { quickDials } from "@/lib/mock-data";

type EmergencyWorkspaceProps = {
  initialContacts: unknown;
  initialPlans: unknown;
  initialHomeInfo: unknown;
};

type ModalMode = "contact" | "plan" | "note" | null;

const defaultContact = {
  name: "",
  relation: "",
  phone: "",
  note: ""
};

const defaultPlan = {
  title: "",
  summary: "",
  steps: ""
};

const defaultNote = {
  label: "",
  value: ""
};

export function EmergencyWorkspace(_: EmergencyWorkspaceProps) {
  const { state, repositoryMode, updateState } = useLifeDockData();
  const contacts = state.emergencyContacts;
  const plans = state.emergencyPlans;
  const notes = state.homeInfo;
  const careContacts = state.careContacts;
  const emergencyDocuments = state.vaultDocuments.filter((document) => document.emergencyVisible);
  const [modal, setModal] = useState<ModalMode>(null);
  const [contactDraft, setContactDraft] = useState(defaultContact);
  const [planDraft, setPlanDraft] = useState(defaultPlan);
  const [noteDraft, setNoteDraft] = useState(defaultNote);

  const closeModal = () => {
    setModal(null);
    setContactDraft(defaultContact);
    setPlanDraft(defaultPlan);
    setNoteDraft(defaultNote);
  };

  const saveContact = () => {
    const name = contactDraft.name.trim();
    const relation = contactDraft.relation.trim();
    const phone = contactDraft.phone.trim();

    if (!name || !relation || !phone) {
      return;
    }

    const initials =
      name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "N";

    updateState((current) => ({
      ...current,
      emergencyContacts: [
        ...current.emergencyContacts,
        {
          id: `ec-${Date.now()}`,
          name,
          relation,
          phone,
          note: contactDraft.note.trim() || undefined
        }
      ],
      careContacts: [
        ...current.careContacts,
        {
          id: `care-${Date.now()}`,
          name,
          relation,
          detail: contactDraft.note.trim() || "Added from Emergency",
          phone,
          initials
        }
      ]
    }));
    closeModal();
  };

  const savePlan = () => {
    const title = planDraft.title.trim();
    const summary = planDraft.summary.trim();
    const steps = planDraft.steps
      .split("\n")
      .map((step) => step.trim())
      .filter(Boolean);

    if (!title || !summary || steps.length === 0) {
      return;
    }

    updateState((current) => ({
      ...current,
      emergencyPlans: [
        ...current.emergencyPlans,
        {
          id: `plan-${Date.now()}`,
          title,
          summary,
          steps
        }
      ]
    }));
    closeModal();
  };

  const saveNote = () => {
    const label = noteDraft.label.trim();
    const value = noteDraft.value.trim();

    if (!label || !value) {
      return;
    }

    updateState((current) => ({
      ...current,
      homeInfo: [...current.homeInfo, { label, value }]
    }));
    closeModal();
  };

  return (
    <>
      <div className="immersive-page">
        <PageHeader
          eyebrow="Emergency"
          title="In an Emergency, We're Here"
          subtitle="Fast access to what matters most, when it matters most."
          heroImage="/images/pages/emergency-hero.png"
          heroPosition="center 44%"
          heroTone="linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(95,24,20,0.12) 42%, rgba(47,28,24,0.5) 100%)"
          badge="Reassurance ready"
          action={
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full border border-white/30 bg-white/14 px-3 py-1 text-[11px] font-semibold text-white/80 backdrop-blur-md sm:inline-flex">
                {repositoryMode === "supabase" ? "Supabase live" : "Session demo"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/14 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur-md">
                <UiIcon name="check" className="h-3.5 w-3.5 text-white" />
                Reviewed today
              </span>
              <Link
                href="/emergency/access"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/18 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/24"
              >
                Limited view
              </Link>
            </div>
          }
        />

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Dial cards", value: quickDials.length },
            { label: "Plans", value: plans.length },
            { label: "Contacts", value: contacts.length },
            { label: "Approved docs", value: emergencyDocuments.length }
          ].map((item) => (
            <article key={item.label} className="estate-sheet px-4 py-4">
              <p className="text-2xl font-semibold tracking-tight text-ink">{item.value}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink/40">{item.label}</p>
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
                className={`flex flex-col gap-2 rounded-[24px] p-4 shadow-soft transition hover:-translate-y-0.5 ${
                  dial.tone === "danger" ? "bg-red-500 text-white" : "estate-sheet"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    dial.tone === "danger" ? "bg-white/20 text-white" : "bg-mist text-sky-700"
                  }`}
                >
                  <UiIcon name="phone" className="h-4 w-4" />
                </span>
                <span>
                  <span className={`block text-sm font-semibold ${dial.tone === "danger" ? "text-white" : "text-ink"}`}>
                    {dial.label}
                  </span>
                  <span className={`mt-0.5 block text-xs ${dial.tone === "danger" ? "text-white/80" : "text-ink/50"}`}>
                    {dial.sub}
                  </span>
                </span>
                <span className={`text-lg font-semibold tracking-tight ${dial.tone === "danger" ? "text-white" : "text-ink"}`}>
                  {dial.number}
                </span>
              </a>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <SectionHeader title="Household plans" hint="Tap a plan to see the steps" />
            <button
              type="button"
              onClick={() => setModal("plan")}
              className="rounded-full border border-white/70 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-ink/70 shadow-soft transition hover:bg-white"
            >
              Add plan
            </button>
          </div>
          <div className="space-y-3">
            {plans.map((plan) => (
              <details key={plan.id} className="estate-sheet group overflow-hidden">
                <summary className="flex cursor-pointer list-none items-center gap-3.5 p-4 [&::-webkit-details-marker]:hidden">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blush text-orange-700">
                    <UiIcon name="alert" className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{plan.title}</span>
                    <span className="mt-0.5 block text-xs text-ink/50">{plan.summary}</span>
                  </span>
                  <span className="shrink-0 text-ink/30 transition-transform duration-200 group-open:rotate-180">
                    <UiIcon name="chevron-down" className="h-4 w-4" />
                  </span>
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
          <div className="flex items-end justify-between gap-3">
            <SectionHeader title="Know your home" hint="Where things are when it matters" />
            <button
              type="button"
              onClick={() => setModal("note")}
              className="rounded-full border border-white/70 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-ink/70 shadow-soft transition hover:bg-white"
            >
              Add note
            </button>
          </div>
          <div className="estate-sheet grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
            {notes.map((info) => (
              <div key={info.label}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/40">{info.label}</p>
                <p className="mt-1 text-sm font-medium text-ink">{info.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader title="Care circle people" hint="Shared live with the Family page" actionLabel="Open Family" actionHref="/family" />
          <div className="estate-sheet divide-y divide-white/60 overflow-hidden">
            {careContacts.map((contact) => (
              <div key={contact.id} className="flex items-center gap-3.5 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-ink">{contact.name}</p>
                    <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-ink/50">
                      {contact.relation}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink/50">
                    {contact.phone} - {contact.detail}
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

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <SectionHeader title="Emergency contacts" actionLabel="Manage in Family" actionHref="/family" />
            <button
              type="button"
              onClick={() => setModal("contact")}
              className="rounded-full border border-white/70 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-ink/70 shadow-soft transition hover:bg-white"
            >
              Add contact
            </button>
          </div>
          <div className="estate-sheet divide-y divide-white/60 overflow-hidden">
            {contacts.map((contact) => (
              <div key={contact.id} className="flex items-center gap-3.5 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-ink">{contact.name}</p>
                    <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-ink/50">
                      {contact.relation}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink/50">
                    {contact.phone}
                    {contact.note ? ` - ${contact.note}` : ""}
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

        <section className="estate-sheet flex items-center gap-3.5 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-mist text-sky-700">
            <UiIcon name="lock" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Sealed documents ready</p>
            <p className="mt-0.5 text-xs leading-5 text-ink/55">
              {emergencyDocuments.length} approved records are available in the limited emergency view.
            </p>
          </div>
          <Link
            href="/emergency/access"
            className="shrink-0 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white shadow-soft transition hover:bg-ink/90"
          >
            Open
          </Link>
        </section>
      </div>

      <ModalShell
        open={modal !== null}
        title={
          modal === "contact"
            ? "Add emergency contact"
            : modal === "plan"
              ? "Add household plan"
              : "Add home note"
        }
        subtitle="Shared across the app through the LifeDock data layer."
        onClose={closeModal}
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold text-ink/60 transition hover:bg-white hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={modal === "contact" ? saveContact : modal === "plan" ? savePlan : saveNote}
              className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-ink/90"
            >
              Save
            </button>
          </div>
        }
      >
        {modal === "contact" ? (
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Name</span>
              <input
                type="text"
                value={contactDraft.name}
                onChange={(event) => setContactDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="Jane Smith"
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-ink">Relationship</span>
                <input
                  type="text"
                  value={contactDraft.relation}
                  onChange={(event) =>
                    setContactDraft((current) => ({ ...current, relation: event.target.value }))
                  }
                  placeholder="Neighbour"
                  className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-ink">Phone</span>
                <input
                  type="text"
                  value={contactDraft.phone}
                  onChange={(event) => setContactDraft((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="07700 123456"
                  className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
                />
              </label>
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Note</span>
              <input
                type="text"
                value={contactDraft.note}
                onChange={(event) => setContactDraft((current) => ({ ...current, note: event.target.value }))}
                placeholder="Holds a spare key"
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              />
            </label>
          </div>
        ) : null}

        {modal === "plan" ? (
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Title</span>
              <input
                type="text"
                value={planDraft.title}
                onChange={(event) => setPlanDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="Flood response"
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Summary</span>
              <input
                type="text"
                value={planDraft.summary}
                onChange={(event) => setPlanDraft((current) => ({ ...current, summary: event.target.value }))}
                placeholder="What to do and who to call"
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Steps</span>
              <textarea
                value={planDraft.steps}
                onChange={(event) => setPlanDraft((current) => ({ ...current, steps: event.target.value }))}
                rows={5}
                placeholder={"Call the insurer\nMove key documents upstairs\nAlert the neighbour"}
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              />
            </label>
          </div>
        ) : null}

        {modal === "note" ? (
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Label</span>
              <input
                type="text"
                value={noteDraft.label}
                onChange={(event) => setNoteDraft((current) => ({ ...current, label: event.target.value }))}
                placeholder="Water stopcock"
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Value</span>
              <input
                type="text"
                value={noteDraft.value}
                onChange={(event) => setNoteDraft((current) => ({ ...current, value: event.target.value }))}
                placeholder="Utility cupboard beside the hall"
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              />
            </label>
          </div>
        ) : null}
      </ModalShell>
    </>
  );
}
