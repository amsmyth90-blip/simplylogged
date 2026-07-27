"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { useLifeDockData } from "@/components/LifeDockDataProvider";
import { ModalShell } from "@/components/ModalShell";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { UiIcon, type IconName } from "@/components/UiIcon";
import { roomDetails, sharedAccess } from "@/lib/mock-data";
import {
  deleteStructuredFamilyInvite,
  upsertStructuredFamilyInvite
} from "@/lib/structured-data";
import type { HouseholdMember, Invite } from "@/lib/lifedock-data";

type InviteDraft = {
  name: string;
  relation: string;
  access: string;
};

const accessStyle: Record<HouseholdMember["accessTone"], string> = {
  full: "bg-sage/70 text-moss",
  shared: "bg-mist text-sky-700",
  limited: "bg-gold/25 text-yellow-800"
};

const defaultDraft: InviteDraft = {
  name: "",
  relation: "",
  access: "Viewer - Memories only"
};

const accessTemplates = [
  {
    id: "owner",
    title: "Owner",
    detail: "Everything, billing, sharing, emergency settings",
    tone: "bg-sage/70 text-moss",
    people: "Amy"
  },
  {
    id: "partner",
    title: "Partner",
    detail: "Full estate access, except sealed legacy actions",
    tone: "bg-mist text-sky-700",
    people: "Michael"
  },
  {
    id: "family",
    title: "Family viewer",
    detail: "Family Room, Garden, reminders, selected memories",
    tone: "bg-gold/25 text-yellow-800",
    people: "Lily, Rose pending"
  },
  {
    id: "emergency",
    title: "Emergency contact",
    detail: "Emergency plan, key contacts, selected Safe Room notes",
    tone: "bg-blush text-orange-700",
    people: "Sarah, David"
  }
];

const roomAccess = [
  { roomId: "office", access: "Restricted", who: "Amy, Michael", note: "Legal, IDs, deeds, finance" },
  { roomId: "safe-room", access: "Emergency only", who: "Amy, Michael, David if unsealed", note: "Emergency and legacy documents" },
  { roomId: "family-room", access: "Family", who: "Everyone in the household", note: "School, plans, shared life admin" },
  { roomId: "garden", access: "Family", who: "Everyone, plus pet carers if added", note: "Pets, outdoor care, seasonal jobs" },
  { roomId: "garage", access: "Partner", who: "Amy, Michael", note: "Vehicles, MOT, breakdown cover" },
  { roomId: "attic", access: "Shared memories", who: "Family viewers allowed", note: "Photos, letters, keepsakes" }
];

const inviteAccessOptions = [
  "Viewer - Memories only",
  "Family viewer - Family Room, Garden, reminders",
  "Emergency fallback - Safe Room essentials only",
  "Partner - Full household access"
];

export function FamilyWorkspace() {
  const { state, repositoryMode, updateState } = useLifeDockData();
  const invites = state.familyInvites;
  const careContacts = state.careContacts;
  const documents = state.vaultDocuments;
  const householdMembers = state.householdMembers;
  const [draft, setDraft] = useState(defaultDraft);
  const [open, setOpen] = useState(false);

  const fullAccessCount = householdMembers.filter((member) => member.accessTone === "full").length;
  const pendingCount = invites.length;
  const latestInvite = invites[invites.length - 1] ?? null;
  const privateDocumentCount = documents.filter((document) => !document.sharedWith?.length).length;
  const sharedDocumentCount = documents.length - privateDocumentCount;
  const emergencyContactCount = careContacts.filter((contact) =>
    `${contact.relation} ${contact.detail}`.toLowerCase().includes("emergency") ||
    `${contact.relation} ${contact.detail}`.toLowerCase().includes("executor") ||
    `${contact.relation} ${contact.detail}`.toLowerCase().includes("spare key")
  ).length;

  const householdCards = useMemo(
    () => [
      { label: "Household", value: householdMembers.length, note: "active members" },
      { label: "Trusted", value: careContacts.length, note: "outside contacts" },
      { label: "Full access", value: fullAccessCount, note: "core organisers" },
      { label: "Pending", value: pendingCount, note: "invite waiting" }
    ],
    [careContacts.length, fullAccessCount, householdMembers.length, pendingCount]
  );

  const sharedDocuments = useMemo(
    () =>
      documents
        .filter((document) => document.sharedWith?.length || document.roomName === "Safe Room")
        .slice(0, 5),
    [documents]
  );

  const closeModal = () => {
    setOpen(false);
    setDraft(defaultDraft);
  };

  const sendInvite = () => {
    const name = draft.name.trim();
    const relation = draft.relation.trim();

    if (!name || !relation) {
      return;
    }

    const initials =
      name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "N";

    const nextInvite: Invite = {
      id: `invite-${Date.now()}`,
      name,
      relation,
      access: draft.access,
      sentAgo: "Just now",
      initials,
      status: "pending"
    };

    updateState((current) => ({
      ...current,
      familyInvites: [...current.familyInvites, nextInvite]
    }));

    void upsertStructuredFamilyInvite(nextInvite);

    closeModal();
  };

  const resendInvite = (id: string) => {
    const nextInvite = invites.find((invite) => invite.id === id);

    updateState((current) => ({
      ...current,
      familyInvites: current.familyInvites.map((invite) =>
        invite.id === id ? { ...invite, sentAgo: "Just now" } : invite
      )
    }));

    if (nextInvite) {
      void upsertStructuredFamilyInvite({ ...nextInvite, sentAgo: "Just now" });
    }
  };

  const cancelInvite = (id: string) => {
    updateState((current) => ({
      ...current,
      familyInvites: current.familyInvites.filter((invite) => invite.id !== id)
    }));

    void deleteStructuredFamilyInvite(id);
  };

  return (
    <>
      <div className="immersive-page">
        <PageHeader
          eyebrow="Family"
          title="Family is Everything"
          subtitle="Bring your loved ones into the circle."
          heroImage="/images/pages/family-hero.png"
          heroPosition="center 52%"
          badge="Care circle"
          action={
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full border border-white/30 bg-white/14 px-3 py-1 text-[11px] font-semibold text-white/80 backdrop-blur-md sm:inline-flex">
                {repositoryMode === "supabase" ? "Supabase live" : "Session demo"}
              </span>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/16 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_18px_30px_-22px_rgba(15,23,42,0.45)] backdrop-blur-md transition hover:bg-white/22"
              >
                <UiIcon name="plus" className="h-4 w-4" />
                Invite
              </button>
            </div>
          }
        />

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {householdCards.map((item) => (
            <article key={item.label} className="estate-sheet px-4 py-4">
              <p className="text-2xl font-semibold tracking-tight text-ink">{item.value}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink/40">{item.label}</p>
              <p className="mt-1 text-xs text-ink/50">{item.note}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <article className="estate-sheet p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sage/60 text-moss">
              <UiIcon name="lock" className="h-5 w-5" />
            </span>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">{privateDocumentCount}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink/40">Private documents</p>
            <p className="mt-1 text-xs leading-5 text-ink/50">Only visible to full-access organisers.</p>
          </article>
          <article className="estate-sheet p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-mist text-sky-700">
              <UiIcon name="share" className="h-5 w-5" />
            </span>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">{sharedDocumentCount}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink/40">Shared documents</p>
            <p className="mt-1 text-xs leading-5 text-ink/50">Visible to named people or shared rooms.</p>
          </article>
          <article className="estate-sheet p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blush text-orange-700">
              <UiIcon name="shield" className="h-5 w-5" />
            </span>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">{emergencyContactCount}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink/40">Emergency fallback</p>
            <p className="mt-1 text-xs leading-5 text-ink/50">People who can help if access is needed fast.</p>
          </article>
        </section>

        <section className="space-y-3">
          <SectionHeader title="Access levels" hint="Simple roles for who can see what" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {accessTemplates.map((template) => (
              <article key={template.id} className="estate-sheet p-4">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${template.tone}`}>
                  {template.title}
                </span>
                <p className="mt-3 text-sm font-semibold text-ink">{template.people}</p>
                <p className="mt-1 text-xs leading-5 text-ink/55">{template.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader title="People" hint="Who is inside the LifeDock circle" />
          <div className="space-y-3">
            {householdMembers.map((member, index) => (
              <article key={member.id} className="estate-sheet p-5">
                <div className="flex items-start gap-4">
                  <Avatar initials={member.initials} size="lg" toneIndex={index} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold tracking-tight text-ink">{member.name}</h2>
                      <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold text-ink/55">
                        {member.role}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm leading-6 text-ink/60">{member.note}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${accessStyle[member.accessTone]}`}>
                        {member.access}
                      </span>
                      {member.manages.map((area) => (
                        <span
                          key={area}
                          className="rounded-full border border-white/70 bg-white/60 px-2.5 py-1 text-[11px] font-medium text-ink/55"
                        >
                          {area}
                        </span>
                      ))}
                      <span className="ml-auto text-xs text-ink/40">Active {member.lastActive.toLowerCase()}</span>
                    </div>
                  </div>
                </div>
              </article>
            ))}

            {latestInvite ? (
              <article className="rounded-[28px] border-2 border-dashed border-ink/15 bg-white/40 p-5">
                <div className="flex items-center gap-4">
                  <Avatar initials={latestInvite.initials} size="lg" toneIndex={3} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold tracking-tight text-ink">{latestInvite.name}</h2>
                      <span className="rounded-full bg-gold/25 px-2.5 py-0.5 text-[11px] font-semibold text-yellow-800">
                        Invite pending
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink/60">
                      {latestInvite.relation} - {latestInvite.access} - Sent {latestInvite.sentAgo}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    <Link
                      href={`/family/invite/${latestInvite.id}`}
                      className="rounded-full bg-ink px-3.5 py-1.5 text-center text-xs font-semibold text-white transition hover:bg-ink/90"
                    >
                      Open invite
                    </Link>
                    <button
                      type="button"
                      onClick={() => resendInvite(latestInvite.id)}
                      className="rounded-full border border-ink/15 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-ink/70 transition hover:bg-white"
                    >
                      Resend
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelInvite(latestInvite.id)}
                      className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-ink/45 transition hover:text-red-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </article>
            ) : null}
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader
            title="Trusted contacts"
            hint="Outside the household, part of the plan"
            actionLabel="Emergency panel"
            actionHref="/emergency"
          />
          <div className="estate-sheet divide-y divide-white/60 overflow-hidden">
            {careContacts.map((contact, index) => (
              <div key={contact.id} className="flex items-center gap-3.5 px-4 py-3.5">
                <Avatar initials={contact.initials} size="sm" toneIndex={index + 1} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-ink">{contact.name}</p>
                    <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-ink/50">
                      {contact.relation}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink/50">{contact.detail}</p>
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
          <SectionHeader title="Room permissions" hint="What each part of the estate exposes" />
          <div className="estate-sheet divide-y divide-white/60 overflow-hidden">
            {roomAccess.map((row) => {
              const room = roomDetails[row.roomId];

              return (
                <div key={row.roomId} className="flex items-center gap-3.5 px-4 py-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mist text-ink/55">
                    <UiIcon name={room.icon as IconName} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-ink">{room.name}</p>
                      <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-ink/50">
                        {row.access}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink/50">{row.who}</p>
                    <p className="mt-0.5 text-xs text-ink/40">{row.note}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader title="Shared documents" hint="Which Vault records have visibility beyond the owner" actionLabel="Open Vault" actionHref="/vault" />
          <div className="estate-sheet divide-y divide-white/60 overflow-hidden">
            {sharedDocuments.length ? (
              sharedDocuments.map((document) => (
                <div key={document.id} className="flex items-center gap-3.5 px-4 py-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage/60 text-moss">
                    <UiIcon name="file" className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{document.title}</p>
                    <p className="mt-0.5 truncate text-xs text-ink/50">
                      {document.sharedWith?.length
                        ? `Shared with ${document.sharedWith.join(", ")}`
                        : "Emergency visibility through Safe Room"}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-5 text-sm text-ink/55">No documents are shared outside the owner yet.</div>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader title="Shared access" hint="Current access summary" />
          <div className="estate-sheet divide-y divide-white/60 overflow-hidden">
            {sharedAccess.map((row) => (
              <div key={row.area} className="flex items-center gap-3.5 px-4 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mist text-ink/55">
                  <UiIcon name={row.icon as IconName} className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{row.area}</p>
                  <p className="mt-0.5 text-xs text-ink/50">{row.who}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="px-1 text-[13px] leading-5 text-ink/45">
            Access changes take effect immediately and are recorded in the Office activity log.
          </p>
        </section>

        <section className="estate-sheet p-5">
          <SectionHeader title="Emergency access mode" hint="What trusted people can see in a crisis" />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl bg-white/65 p-4">
              <p className="text-sm font-semibold text-ink">Daily life stays private</p>
              <p className="mt-1 text-xs leading-5 text-ink/55">
                Family viewers see shared rooms and selected reminders, not the whole Vault.
              </p>
            </div>
            <div className="rounded-3xl bg-white/65 p-4">
              <p className="text-sm font-semibold text-ink">Emergency fallback</p>
              <p className="mt-1 text-xs leading-5 text-ink/55">
                Trusted contacts see emergency plans, key contacts, and approved Safe Room notes.
              </p>
            </div>
            <div className="rounded-3xl bg-white/65 p-4">
              <p className="text-sm font-semibold text-ink">Legacy handoff</p>
              <p className="mt-1 text-xs leading-5 text-ink/55">
                Executor access stays sealed until it is explicitly needed, keeping legal records private by default.
              </p>
            </div>
          </div>
        </section>
      </div>

      <ModalShell
        open={open}
        title="Invite someone in"
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
              onClick={sendInvite}
              className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-ink/90"
            >
              Send invite
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink">Name</span>
            <input
              type="text"
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="Rose Smyth"
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Relationship</span>
              <input
                type="text"
                value={draft.relation}
                onChange={(event) => setDraft((current) => ({ ...current, relation: event.target.value }))}
                placeholder="Grandma"
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Access level</span>
              <select
                value={draft.access}
                onChange={(event) => setDraft((current) => ({ ...current, access: event.target.value }))}
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              >
                {inviteAccessOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white/70 px-4 py-3">
            <p className="text-sm font-semibold text-ink">Invite preview</p>
            <p className="mt-1 text-xs leading-5 text-ink/55">
              {draft.access.includes("Emergency")
                ? "They will only see emergency-approved details and Safe Room essentials."
                : draft.access.includes("Partner")
                  ? "They will have broad household access, so only send this to someone you fully trust."
                  : draft.access.includes("Family viewer")
                    ? "They will see shared family spaces, reminders, and low-risk household information."
                    : "They will only see memories and explicitly shared family content."}
            </p>
          </div>
        </div>
      </ModalShell>
    </>
  );
}
