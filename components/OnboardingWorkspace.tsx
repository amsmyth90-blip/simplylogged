"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { PageHeader } from "@/components/PageHeader";
import { UiIcon, type IconName } from "@/components/UiIcon";
import {
  OPTIONAL_DASHBOARD_AREAS,
  normaliseDashboardAreaIds
} from "@/lib/dashboard-areas";
import { estateAreas } from "@/lib/mock-data";

const householdChoices = [
  { value: "Just me", title: "Just me", detail: "A private DiaryDock for your own life admin.", icon: "heart" },
  { value: "Me and my partner", title: "Me and my partner", detail: "Organise personal and shared household information.", icon: "users" },
  { value: "Family with children", title: "Family with children", detail: "Include household profiles, plans and family schedules.", icon: "home" },
  { value: "Other shared household", title: "Other household", detail: "For relatives, housemates or another shared setup.", icon: "users" }
] as const;

const stepTitles = ["Your profile", "Your household", "Choose your areas", "Your dashboard"] as const;

function initialsForName(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

export function OnboardingWorkspace() {
  const router = useRouter();
  const { state, repositoryMode, updateState } = useDiaryDockData();
  const [step, setStep] = useState(0);
  const onboarding = state.onboarding;

  const selectedAreaIds = useMemo(
    () => normaliseDashboardAreaIds(onboarding.selectedRooms),
    [onboarding.selectedRooms]
  );
  const selectedAreas = estateAreas.filter((area) => selectedAreaIds.includes(area.id));

  const updateProfile = (field: "name" | "householdName", value: string) => {
    updateState((current) => ({
      ...current,
      settingsProfile: field === "name"
        ? { ...current.settingsProfile, name: value, initials: initialsForName(value) }
        : current.settingsProfile,
      onboarding: {
        ...current.onboarding,
        completed: false,
        householdName: field === "householdName" ? value : current.onboarding.householdName
      }
    }));
  };

  const chooseHousehold = (value: string) => {
    updateState((current) => {
      const shouldShowFamily = value !== "Just me";
      const selectedRooms = shouldShowFamily
        ? [...current.onboarding.selectedRooms, "family-room"]
        : current.onboarding.selectedRooms.filter((roomId) => roomId !== "family-room");
      return {
        ...current,
        onboarding: {
          ...current.onboarding,
          completed: false,
          householdMembers: value,
          selectedRooms: normaliseDashboardAreaIds(selectedRooms)
        }
      };
    });
  };

  const toggleArea = (roomId: string) => {
    updateState((current) => {
      const selectedRooms = current.onboarding.selectedRooms.includes(roomId)
        ? current.onboarding.selectedRooms.filter((id) => id !== roomId)
        : [...current.onboarding.selectedRooms, roomId];
      return {
        ...current,
        onboarding: {
          ...current.onboarding,
          completed: false,
          selectedRooms: normaliseDashboardAreaIds(selectedRooms)
        }
      };
    });
  };

  const canContinue = step === 0
    ? Boolean(state.settingsProfile.name.trim() && onboarding.householdName.trim())
    : step === 1
      ? Boolean(onboarding.householdMembers.trim())
      : true;

  const finishSetup = () => {
    updateState((current) => ({
      ...current,
      onboarding: {
        ...current.onboarding,
        completed: true,
        dashboardAreasConfigured: true,
        selectedRooms: normaliseDashboardAreaIds(current.onboarding.selectedRooms)
      }
    }));
    router.push("/dashboard");
  };

  return (
    <div className="immersive-page">
      <PageHeader
        eyebrow="Welcome to DiaryDock"
        title="Let’s make it yours"
        subtitle="A few simple questions will create a calmer dashboard for your life. Nothing is permanent."
        heroImage="/images/estate-map-light.png"
        heroPosition="center 20%"
        badge={repositoryMode === "supabase" ? "Private setup" : "Session setup"}
      />

      <section className="estate-sheet p-4 sm:p-5" aria-label="Onboarding progress">
        <div className="flex items-center gap-2">
          {stepTitles.map((title, index) => (
            <div key={title} className="min-w-0 flex-1">
              <div className={`h-1.5 rounded-full ${index <= step ? "bg-moss" : "bg-ink/10"}`} />
              <span className="sr-only">{title}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs font-semibold text-ink/55">Step {step + 1} of {stepTitles.length} · {stepTitles[step]}</p>
      </section>

      {step === 0 ? (
        <section className="estate-sheet p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">Start with you</p>
          <h1 className="mt-2 font-serif text-3xl text-ink">What should we call you?</h1>
          <p className="mt-2 text-sm leading-6 text-ink/55">These details personalise your app and can be changed later.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink">Your name</span>
              <input value={state.settingsProfile.name} onChange={(event) => updateProfile("name", event.target.value)} placeholder="e.g. Amy Smyth" autoComplete="name" className="w-full rounded-2xl border border-black/10 bg-white/85 px-4 py-3 text-base text-ink outline-none focus:border-moss" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink">Household name</span>
              <input value={onboarding.householdName} onChange={(event) => updateProfile("householdName", event.target.value)} placeholder="e.g. The Smyth household" className="w-full rounded-2xl border border-black/10 bg-white/85 px-4 py-3 text-base text-ink outline-none focus:border-moss" />
            </label>
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="space-y-4">
          <div className="px-1"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">Your household</p><h1 className="mt-2 font-serif text-3xl text-ink">Who is DiaryDock for?</h1><p className="mt-2 text-sm leading-6 text-ink/55">This helps us recommend the right areas. It does not give anyone access.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {householdChoices.map((choice) => {
              const selected = onboarding.householdMembers === choice.value;
              return <button key={choice.value} type="button" onClick={() => chooseHousehold(choice.value)} aria-pressed={selected} className={`estate-sheet flex min-h-24 items-center gap-4 p-4 text-left transition ${selected ? "ring-2 ring-moss/55" : "hover:-translate-y-0.5"}`}><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${selected ? "bg-moss text-white" : "bg-sage/60 text-moss"}`}><UiIcon name={choice.icon as IconName} className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">{choice.title}</span><span className="mt-1 block text-xs leading-5 text-ink/55">{choice.detail}</span></span>{selected ? <UiIcon name="check" className="h-5 w-5 text-moss" /> : null}</button>;
            })}
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-4">
          <div className="px-1"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">Personalise your home</p><h1 className="mt-2 font-serif text-3xl text-ink">What belongs in your DiaryDock?</h1><p className="mt-2 text-sm leading-6 text-ink/55">Switch on only what is useful now. You can add anything later in Settings.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {OPTIONAL_DASHBOARD_AREAS.map((question) => {
              const area = estateAreas.find((item) => item.id === question.roomId);
              const selected = selectedAreaIds.includes(question.roomId);
              if (!area) return null;
              return <button key={question.roomId} type="button" onClick={() => toggleArea(question.roomId)} role="switch" aria-checked={selected} className="estate-sheet flex min-h-28 items-center gap-4 p-4 text-left"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${selected ? "bg-moss text-white" : "bg-mist text-ink/45"}`}><UiIcon name={area.icon as IconName} className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">{question.question}</span><span className="mt-1 block text-xs leading-5 text-ink/52">{question.detail}</span></span><span className={`relative h-7 w-12 shrink-0 rounded-full ${selected ? "bg-moss" : "bg-slate-300"}`}><span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${selected ? "left-[22px]" : "left-0.5"}`} /></span></button>;
            })}
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="estate-sheet overflow-hidden">
          <div className="bg-[#315443] p-5 text-white"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/65">Ready to begin</p><h1 className="mt-2 font-serif text-3xl">Your DiaryDock dashboard</h1><p className="mt-2 text-sm leading-6 text-white/72">We’ll show these {selectedAreas.length} areas. Hidden areas remain safe and can be added from Settings whenever life changes.</p></div>
          <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
            {selectedAreas.map((area) => <div key={area.id} className="rounded-2xl bg-[#f5f4ed] p-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#dde6d8] text-[#315443]"><UiIcon name={area.icon as IconName} className="h-4 w-4" /></span><p className="mt-2 text-sm font-semibold text-ink">{area.dashboardLabel ?? area.name}</p><p className="mt-0.5 text-[10px] leading-4 text-ink/48">{area.domain}</p></div>)}
          </div>
          <p className="px-4 pb-4 text-xs leading-5 text-ink/50">Home, Documents, Inbox and Settings are always available so the essentials can never disappear.</p>
        </section>
      ) : null}

      <div className="flex items-center gap-3 pb-4">
        {step > 0 ? <button type="button" onClick={() => setStep((current) => current - 1)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-ink/15 bg-white/75 px-5 text-sm font-semibold text-ink"><UiIcon name="arrow-left" className="h-4 w-4" />Back</button> : null}
        <button type="button" disabled={!canContinue} onClick={() => step === stepTitles.length - 1 ? finishSetup() : setStep((current) => current + 1)} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-ink px-5 text-sm font-semibold text-white shadow-soft disabled:cursor-not-allowed disabled:opacity-40">{step === stepTitles.length - 1 ? "Open my DiaryDock" : "Continue"}<UiIcon name={step === stepTitles.length - 1 ? "check" : "chevron-right"} className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
