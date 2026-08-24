"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { UiIcon } from "@/components/UiIcon";
import {
  acceptHouseholdInvite,
  getHouseholdInvite,
  type HouseholdInvitePreview
} from "@/lib/household-sharing";
import type { Invite } from "@/lib/diarydock-data";

type InviteAcceptanceWorkspaceProps = {
  inviteId: string;
};

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

export function InviteAcceptanceWorkspace({ inviteId }: InviteAcceptanceWorkspaceProps) {
  const router = useRouter();
  const [preview, setPreview] = useState<HouseholdInvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadInvite = async () => {
      try {
        const nextPreview = await getHouseholdInvite(inviteId);
        if (!cancelled) {
          setPreview(nextPreview);
          setError(
            nextPreview
              ? ""
              : "This invite is unavailable. Sign in with the email address it was created for."
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "The invite could not be loaded.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadInvite();

    return () => {
      cancelled = true;
    };
  }, [inviteId]);

  const invite: Invite | null = preview
    ? {
        id: preview.token,
        name: preview.name,
        relation: preview.relation,
        access: preview.access,
        sentAgo: "Recently",
        initials:
          preview.name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join("") || "LD",
        status: "pending"
      }
    : null;

  const acceptInvite = async () => {
    if (!invite) return;

    setAccepting(true);
    setError("");

    try {
      await acceptHouseholdInvite(invite.id);
      router.push("/dashboard?joined=1");
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "The invite could not be accepted.");
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader eyebrow="Family invite" title="Loading invite" backHref="/family" backLabel="Family" />
        <div className="estate-sheet p-5 text-sm text-ink/55">Checking the invite details...</div>
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
          message={error || "It may already have been accepted, cancelled or created for a different email."}
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
        subtitle={`Join ${preview?.householdName ?? "this household"} using the access shown below.`}
        backHref="/family"
        backLabel="Family"
        heroImage="/images/pages/family-hero.webp"
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
          onClick={() => void acceptInvite()}
          disabled={accepting}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-ink/90"
        >
          {accepting ? "Joining household..." : "Accept invite"}
          <UiIcon name="chevron-right" className="h-4 w-4" />
        </button>
        {error ? (
          <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
        ) : null}
      </section>
    </div>
  );
}
