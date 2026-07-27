"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { useLifeDockData } from "@/components/LifeDockDataProvider";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { UiIcon } from "@/components/UiIcon";
import type { HouseholdMember, Invite } from "@/lib/lifedock-data";
import {
  deleteStructuredFamilyInvite,
  upsertStructuredHouseholdMember
} from "@/lib/structured-data";

type InviteAcceptanceWorkspaceProps = {
  inviteId: string;
};

function accessToneForInvite(access: string): HouseholdMember["accessTone"] {
  if (access.includes("Partner")) {
    return "full";
  }

  if (access.includes("Family viewer")) {
    return "shared";
  }

  return "limited";
}

function managedAreasForInvite(access: string) {
  if (access.includes("Partner")) {
    return ["Office", "Garage", "Family Room", "Emergency"];
  }

  if (access.includes("Emergency")) {
    return ["Safe Room", "Emergency"];
  }

  if (access.includes("Family viewer")) {
    return ["Family Room", "Garden", "Reminders"];
  }

  return ["Attic"];
}

function roleForInvite(invite: Invite) {
  if (invite.access.includes("Partner")) {
    return "Partner";
  }

  if (invite.access.includes("Emergency")) {
    return "Emergency Contact";
  }

  if (invite.access.includes("Family viewer")) {
    return "Family Viewer";
  }

  return invite.relation || "Family Member";
}

function memberFromInvite(invite: Invite): HouseholdMember {
  return {
    id: `member-${invite.id}`,
    name: invite.name,
    role: roleForInvite(invite),
    access: invite.access.includes("Partner")
      ? "Full access"
      : invite.access.includes("Family viewer")
        ? "Shared access"
        : "Limited access",
    accessTone: accessToneForInvite(invite.access),
    note: `${invite.relation} joined through a LifeDock invite.`,
    initials: invite.initials,
    manages: managedAreasForInvite(invite.access),
    lastActive: "Now"
  };
}

export function InviteAcceptanceWorkspace({ inviteId }: InviteAcceptanceWorkspaceProps) {
  const { state, hydrated, updateState } = useLifeDockData();
  const [accepted, setAccepted] = useState(false);

  const invite = state.familyInvites.find((item) => item.id === inviteId) ?? null;
  const acceptedMember = useMemo(
    () => state.householdMembers.find((member) => member.id === `member-${inviteId}`) ?? null,
    [inviteId, state.householdMembers]
  );

  const acceptInvite = () => {
    if (!invite) {
      return;
    }

    const nextMember = memberFromInvite(invite);

    updateState((current) => ({
      ...current,
      householdMembers: [
        nextMember,
        ...current.householdMembers.filter(
          (member) => member.id !== nextMember.id && member.name.toLowerCase() !== nextMember.name.toLowerCase()
        )
      ],
      familyInvites: current.familyInvites.filter((item) => item.id !== invite.id)
    }));

    void upsertStructuredHouseholdMember(nextMember);
    void deleteStructuredFamilyInvite(invite.id);
    setAccepted(true);
  };

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <PageHeader eyebrow="Family invite" title="Loading invite" backHref="/family" backLabel="Family" />
        <div className="estate-sheet p-5 text-sm text-ink/55">Checking the invite details...</div>
      </div>
    );
  }

  if (accepted || acceptedMember) {
    return (
      <div className="space-y-4">
        <PageHeader
          eyebrow="Family invite"
          title="Welcome to LifeDock"
          subtitle="This person is now part of the household circle."
          backHref="/family"
          backLabel="Family"
          heroImage="/images/pages/family-hero.png"
          heroPosition="center 52%"
          badge="Invite accepted"
        />
        <section className="estate-sheet p-5">
          <div className="flex items-center gap-4">
            <Avatar initials={acceptedMember?.initials ?? "OK"} size="lg" toneIndex={2} />
            <div>
              <p className="text-lg font-semibold tracking-tight text-ink">
                {acceptedMember?.name ?? "Family member"} added
              </p>
              <p className="mt-1 text-sm leading-6 text-ink/55">
                Access is saved in the household member records and can be managed from Family.
              </p>
            </div>
          </div>
          <Link
            href="/family"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-soft"
          >
            Open Family
            <UiIcon name="chevron-right" className="h-4 w-4" />
          </Link>
        </section>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="space-y-4">
        <PageHeader eyebrow="Family invite" title="Invite not found" backHref="/family" backLabel="Family" />
        <EmptyState
          icon="users"
          title="This invite is no longer active"
          message="It may already have been accepted or cancelled."
          action={
            <Link href="/family" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
              Back to Family
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Family invite"
        title={`${invite.name} has been invited`}
        subtitle="Review the access level before adding them to this LifeDock household."
        backHref="/family"
        backLabel="Family"
        heroImage="/images/pages/family-hero.png"
        heroPosition="center 52%"
        badge="Pending"
      />

      <section className="estate-sheet p-5">
        <div className="flex items-start gap-4">
          <Avatar initials={invite.initials} size="lg" toneIndex={3} />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold tracking-tight text-ink">{invite.name}</h2>
            <p className="mt-1 text-sm text-ink/55">{invite.relation}</p>
            <span className="mt-3 inline-flex rounded-full bg-gold/25 px-3 py-1 text-xs font-semibold text-yellow-800">
              {invite.access}
            </span>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <SectionHeader title="What they can access" hint="This is based on the selected invite role" />
          <div className="grid gap-2">
            {managedAreasForInvite(invite.access).map((area) => (
              <div key={area} className="flex items-center gap-3 rounded-2xl bg-white/72 px-3.5 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sage/60 text-moss">
                  <UiIcon name="check" className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold text-ink">{area}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={acceptInvite}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-ink/90"
        >
          Accept invite
          <UiIcon name="chevron-right" className="h-4 w-4" />
        </button>
      </section>
    </div>
  );
}
