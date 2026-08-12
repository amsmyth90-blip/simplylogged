"use client";

import Link from "next/link";
import { useMemo } from "react";

import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { UiIcon, type IconName } from "@/components/UiIcon";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { getOnboardingProgress } from "@/lib/diarydock-data";
import { roomDetails } from "@/lib/mock-data";

const priorityRooms = ["office", "safe-room", "bedroom", "family-room", "garage", "garden", "driveway", "attic"];

export function OnboardingWorkspace() {
  const { state, repositoryMode, updateState } = useDiaryDockData();
  const onboarding = state.onboarding;
  const progress = getOnboardingProgress(onboarding);

  const setupSteps = useMemo(
    () => [
      {
        id: "household",
        title: "Name your household",
        detail: onboarding.householdName || "Add a name so DiaryDock feels personal.",
        complete: Boolean(onboarding.householdName.trim()),
        href: "#household"
      },
      {
        id: "rooms",
        title: "Choose your key rooms",
        detail: `${onboarding.selectedRooms.length} rooms selected`,
        complete: onboarding.selectedRooms.length >= 4,
        href: "#rooms"
      },
      {
        id: "documents",
        title: "Add your first documents",
        detail: `${onboarding.starterDocuments.filter((document) => document.done).length} starter documents checked`,
        complete: onboarding.starterDocuments.some((document) => document.done),
        href: "#documents"
      },
      {
        id: "emergency",
        title: "Add emergency cover",
        detail: onboarding.emergencyContactAdded ? "Emergency contact ready" : "Add at least one emergency person.",
        complete: onboarding.emergencyContactAdded,
        href: "/emergency"
      },
      {
        id: "family",
        title: "Invite trusted family",
        detail: onboarding.familyInviteAdded ? "Care circle started" : "Invite someone you trust.",
        complete: onboarding.familyInviteAdded,
        href: "/family"
      }
    ],
    [onboarding]
  );

  const updateHousehold = (field: "householdName" | "householdMembers", value: string) => {
    updateState((current) => ({
      ...current,
      onboarding: {
        ...current.onboarding,
        completed: false,
        [field]: value
      }
    }));
  };

  const toggleRoom = (roomId: string) => {
    updateState((current) => {
      const selected = current.onboarding.selectedRooms.includes(roomId)
        ? current.onboarding.selectedRooms.filter((id) => id !== roomId)
        : [...current.onboarding.selectedRooms, roomId];

      return {
        ...current,
        onboarding: {
          ...current.onboarding,
          completed: false,
          selectedRooms: selected
        }
      };
    });
  };

  const toggleStarterDocument = (documentId: string) => {
    updateState((current) => ({
      ...current,
      onboarding: {
        ...current.onboarding,
        completed: false,
        starterDocuments: current.onboarding.starterDocuments.map((document) =>
          document.id === documentId ? { ...document, done: !document.done } : document
        )
      }
    }));
  };

  const finishSetup = () => {
    updateState((current) => ({
      ...current,
      onboarding: {
        ...current.onboarding,
        completed: true
      }
    }));
  };

  return (
    <div className="immersive-page">
      <PageHeader
        eyebrow="First setup"
        title="Set up your DiaryDock"
        subtitle="Start with the people, rooms, and documents that matter most. You can keep refining it later."
        heroImage="/images/estate-map-light.png"
        heroPosition="center 20%"
        badge={repositoryMode === "supabase" ? "Secure account" : "Session setup"}
        action={
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/16 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_18px_30px_-22px_rgba(15,23,42,0.45)] backdrop-blur-md transition hover:bg-white/22"
          >
            Dashboard
          </Link>
        }
      />

      <section className="estate-sheet p-5">
        <div className="flex items-start gap-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/70">
            <span className="text-xl font-semibold tracking-tight text-ink">{progress.percent}%</span>
            <span className="absolute inset-0 rounded-full border-4 border-moss/25" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold tracking-tight text-ink">
              {onboarding.completed ? "Setup complete" : "Your setup checklist"}
            </p>
            <p className="mt-1 text-sm leading-6 text-ink/58">
              {progress.completed} of {progress.total} steps are ready. DiaryDock gets calmer and more useful with every item you add.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-5">
              {setupSteps.map((step) => (
                <Link
                  key={step.id}
                  href={step.href}
                  className={`rounded-2xl border px-3 py-3 text-left ${
                    step.complete ? "border-moss/15 bg-sage/40" : "border-white/70 bg-white/58"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${
                      step.complete ? "bg-moss text-white" : "bg-mist text-ink/45"
                    }`}
                  >
                    <UiIcon name={step.complete ? "check" : "plus"} className="h-3.5 w-3.5" />
                  </span>
                  <span className="mt-2 block text-xs font-semibold text-ink">{step.title}</span>
                  <span className="mt-1 block text-[11px] leading-4 text-ink/48">{step.detail}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="household" className="estate-sheet p-5">
        <SectionHeader title="Household basics" hint="Make DiaryDock feel like yours" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink">Household name</span>
            <input
              type="text"
              value={onboarding.householdName}
              onChange={(event) => updateHousehold("householdName", event.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink">People at home</span>
            <input
              type="text"
              value={onboarding.householdMembers}
              onChange={(event) => updateHousehold("householdMembers", event.target.value)}
              placeholder="Amy, Michael, Lily"
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
            />
          </label>
        </div>
      </section>

      <section id="rooms" className="space-y-3">
        <SectionHeader title="Choose key rooms" hint="Start with the rooms that matter most to your family" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {priorityRooms.map((roomId) => {
            const room = roomDetails[roomId];
            const selected = onboarding.selectedRooms.includes(roomId);

            return (
              <button
                key={roomId}
                type="button"
                onClick={() => toggleRoom(roomId)}
                className={`estate-sheet p-4 text-left transition hover:-translate-y-0.5 ${
                  selected ? "ring-1 ring-moss/30" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mist text-ink/55">
                    <UiIcon name={room.icon as IconName} className="h-5 w-5" />
                  </span>
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full ${
                      selected ? "bg-moss text-white" : "bg-white/80 text-ink/28"
                    }`}
                  >
                    <UiIcon name="check" className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-ink">{room.name}</p>
                <p className="mt-1 text-xs leading-5 text-ink/52">{room.domain}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section id="documents" className="space-y-3">
        <SectionHeader title="Starter documents" hint="A gentle first list to make the estate useful fast" />
        <div className="estate-sheet divide-y divide-white/60 overflow-hidden">
          {onboarding.starterDocuments.map((document) => (
            <div key={document.id} className="flex items-center gap-3.5 px-4 py-3.5">
              <button
                type="button"
                onClick={() => toggleStarterDocument(document.id)}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                  document.done ? "border-moss bg-moss text-white" : "border-slate-300 bg-white text-transparent"
                }`}
                aria-label={document.done ? `Mark ${document.title} as not added` : `Mark ${document.title} as added`}
              >
                <UiIcon name="check" className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{document.title}</p>
                <p className="mt-0.5 text-xs text-ink/50">Suggested room: {document.roomName}</p>
              </div>
              <Link
                href="/capture"
                className="shrink-0 rounded-full border border-black/10 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-ink/65"
              >
                Scan
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link href="/family" className="estate-sheet flex items-center gap-3.5 p-5 transition hover:-translate-y-0.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-mist text-sky-700">
            <UiIcon name="users" className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">Set family access</span>
            <span className="mt-0.5 block text-xs leading-5 text-ink/55">Invite trusted people and decide who can see what.</span>
          </span>
          <UiIcon name="chevron-right" className="h-4 w-4 text-ink/30" />
        </Link>
        <Link href="/emergency" className="estate-sheet flex items-center gap-3.5 p-5 transition hover:-translate-y-0.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blush text-orange-700">
            <UiIcon name="shield" className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">Review emergency cover</span>
            <span className="mt-0.5 block text-xs leading-5 text-ink/55">Add key contacts, home notes, and emergency plans.</span>
          </span>
          <UiIcon name="chevron-right" className="h-4 w-4 text-ink/30" />
        </Link>
      </section>

      <section className="estate-sheet p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">Ready to use DiaryDock?</p>
            <p className="mt-1 text-xs leading-5 text-ink/55">
              Finish setup when the essentials are in place. You can still add and correct everything later.
            </p>
          </div>
          <button
            type="button"
            onClick={finishSetup}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-ink/90"
          >
            <UiIcon name="check" className="h-4 w-4" />
            {onboarding.completed ? "Setup complete" : "Finish setup"}
          </button>
        </div>
      </section>
    </div>
  );
}
