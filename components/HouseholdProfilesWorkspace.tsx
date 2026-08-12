"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { BottomNav } from "@/components/BottomNav";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { ModalShell } from "@/components/ModalShell";
import { UiIcon } from "@/components/UiIcon";
import type { HouseholdProfile } from "@/lib/diarydock-data";

type ProfileDraft = Omit<HouseholdProfile, "id" | "linkedUserId">;

const colours: HouseholdProfile["colour"][] = ["sage", "blue", "clay", "gold"];

const colourStyles: Record<HouseholdProfile["colour"], { avatar: string; dot: string }> = {
  sage: { avatar: "bg-[#dce8d5] text-[#52694a]", dot: "bg-[#759166]" },
  blue: { avatar: "bg-[#dce9f2] text-[#48677b]", dot: "bg-[#789ab3]" },
  clay: { avatar: "bg-[#f0ded3] text-[#805641]", dot: "bg-[#b97d5c]" },
  gold: { avatar: "bg-[#f2e7c9] text-[#79612d]", dot: "bg-[#b4974d]" }
};

const kindLabels: Record<HouseholdProfile["kind"], string> = {
  adult: "Adult",
  child: "Child",
  housemate: "Housemate",
  trusted: "Trusted person"
};

const accessLabels: Record<HouseholdProfile["appAccess"], string> = {
  none: "Profile only",
  viewer: "Viewer access",
  member: "Can contribute"
};

const emptyDraft: ProfileDraft = {
  name: "",
  kind: "adult",
  relationship: "",
  colour: "sage",
  appAccess: "none",
  showInSchedules: true,
  showInMeals: true,
  showInReminders: true
};

function initialsFor(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "LD"
  );
}

export function HouseholdProfilesWorkspace() {
  const { state, household, hydrated, canManageHousehold, updateState } = useDiaryDockData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
  const [editorOpen, setEditorOpen] = useState(false);
  const [profilesOpen, setProfilesOpen] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  const profiles = useMemo(() => {
    const saved = state.householdProfiles;
    const accountProfiles: HouseholdProfile[] = state.householdMembers
      .filter(
        (member) =>
          !saved.some(
            (profile) =>
              profile.id === member.id ||
              profile.linkedUserId === member.userId ||
              profile.name.toLowerCase() === member.name.toLowerCase()
          )
      )
      .map((member, index) => ({
        id: member.id,
        name: member.name,
        kind: "adult",
        relationship: member.role || "Household member",
        colour: colours[index % colours.length],
        appAccess:
          member.accessTone === "full" || member.accessTone === "shared" ? "member" : "viewer",
        showInSchedules: true,
        showInMeals: true,
        showInReminders: true,
        linkedUserId: member.userId ?? member.id
      }));

    const knownNames = [...saved, ...accountProfiles].map((profile) =>
      profile.name.toLowerCase()
    );
    const scheduleProfiles: HouseholdProfile[] = Array.from(
      new Set(state.kidSchedules.map((routine) => routine.childName.trim()).filter(Boolean))
    )
      .filter((name) => !knownNames.includes(name.toLowerCase()))
      .map((name, index) => ({
        id: `schedule-profile-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name,
        kind: "child",
        relationship: "Child",
        colour: colours[(saved.length + accountProfiles.length + index) % colours.length],
        appAccess: "none",
        showInSchedules: true,
        showInMeals: true,
        showInReminders: true
      }));

    return [...saved, ...accountProfiles, ...scheduleProfiles];
  }, [state.householdMembers, state.householdProfiles, state.kidSchedules]);

  const selectedProfile =
    profiles.find((profile) => profile.id === selectedProfileId) ?? profiles[0] ?? null;
  const rosterProfiles = profiles.slice(0, 3);
  const orbitProfiles = profiles.slice(0, 4);
  const orbitPositions = [
    { left: "22%", top: "18%" },
    { left: "78%", top: "18%" },
    { left: "22%", top: "69%" },
    { left: "78%", top: "69%" }
  ];

  const openNew = () => {
    setEditingId(null);
    setDraft({ ...emptyDraft, colour: colours[profiles.length % colours.length] });
    setMessage("");
    setEditorOpen(true);
  };

  const openEdit = (profile: HouseholdProfile) => {
    const { id, linkedUserId: _linkedUserId, ...nextDraft } = profile;
    setEditingId(id);
    setDraft(nextDraft);
    setMessage("");
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
    setDraft(emptyDraft);
    setMessage("");
  };

  const saveProfile = () => {
    const name = draft.name.trim();
    if (!name) {
      setMessage("Add this person's name.");
      return;
    }

    const existing = profiles.find((profile) => profile.id === editingId);
    const profile: HouseholdProfile = {
      ...draft,
      id: editingId ?? crypto.randomUUID(),
      name,
      relationship: draft.relationship.trim(),
      linkedUserId: existing?.linkedUserId
    };

    updateState((current) => ({
      ...current,
      householdProfiles: current.householdProfiles.some((item) => item.id === profile.id)
        ? current.householdProfiles.map((item) => (item.id === profile.id ? profile : item))
        : [...current.householdProfiles, profile]
    }));
    setSelectedProfileId(profile.id);
    closeEditor();
  };

  const deleteProfile = () => {
    if (
      !editingId ||
      editingId.startsWith("schedule-profile-") ||
      profiles.find((profile) => profile.id === editingId)?.linkedUserId
    ) return;
    updateState((current) => ({
      ...current,
      householdProfiles: current.householdProfiles.filter((profile) => profile.id !== editingId)
    }));
    if (selectedProfileId === editingId) {
      setSelectedProfileId(null);
    }
    closeEditor();
  };

  const toggleSurface = (
    key: "showInSchedules" | "showInMeals" | "showInReminders"
  ) => {
    setDraft((current) => ({ ...current, [key]: !current[key] }));
  };

  const selectProfile = (profileId: string) => {
    setSelectedProfileId(profileId);
    setProfilesOpen(false);
  };

  const featureDestinations = selectedProfile
    ? [
        {
          label: "Schedules",
          icon: "calendar" as const,
          enabled: selectedProfile.showInSchedules,
          detail: `${state.kidSchedules.filter((routine) => routine.childName.toLowerCase() === selectedProfile.name.toLowerCase()).length} weekly activities`,
          tone: "bg-[#dfead9] text-[#5b7451]",
          href: `/family/schedules?person=${encodeURIComponent(selectedProfile.name)}`
        },
        {
          label: "Meals",
          icon: "home" as const,
          enabled: selectedProfile.showInMeals,
          detail: "Included in the family meal plan",
          tone: "bg-[#f2dfd3] text-[#9a6547]",
          href: `/kitchen/meal-planner?profile=${encodeURIComponent(selectedProfile.id)}&person=${encodeURIComponent(selectedProfile.name)}`
        },
        {
          label: "Reminders",
          icon: "check" as const,
          enabled: selectedProfile.showInReminders,
          detail: `${state.reminders.filter((reminder) => reminder.assignedTo?.toLowerCase() === selectedProfile.name.toLowerCase()).length} assigned reminders`,
          tone: "bg-[#dce8f1] text-[#58778d]",
          href: `/reminders?person=${encodeURIComponent(selectedProfile.name)}`
        }
      ]
    : [];

  return (
    <>
      <div className="fixed inset-0 overflow-hidden bg-[radial-gradient(circle_at_10%_0%,rgba(255,255,255,0.98),transparent_35%),linear-gradient(180deg,#edf3e9_0%,#fbfaf6_50%,#e8f0e5_100%)] text-slate-900">
        <main className="mx-auto flex h-full w-full max-w-lg flex-col px-4 pb-[82px] pt-[max(12px,env(safe-area-inset-top))]">
          <header className="flex shrink-0 items-center gap-3">
            <Link
              href="/family"
              aria-label="Back to Family"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/90 bg-white/75 text-slate-700 shadow-sm backdrop-blur-xl"
            >
              <UiIcon name="arrow-left" className="h-4 w-4" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#66805c]">
                Family Room
              </p>
              <h1 className="text-xl font-semibold tracking-tight">Household profiles</h1>
            </div>
            <button
              type="button"
              onClick={openNew}
              disabled={!hydrated || !canManageHousehold}
              aria-label="Add household profile"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#273d34] text-white shadow-[0_12px_24px_-14px_rgba(30,55,43,0.8)] disabled:opacity-40"
            >
              <UiIcon name="plus" className="h-4 w-4" />
            </button>
          </header>

          <section className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[30px] border border-white/90 bg-white/72 p-3 shadow-[0_26px_65px_-38px_rgba(39,58,43,0.62)] backdrop-blur-xl">
            <div className="grid h-[88px] shrink-0 grid-cols-4 gap-2">
              {rosterProfiles.map((profile) => {
                const selected = selectedProfile?.id === profile.id;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => setSelectedProfileId(profile.id)}
                    aria-label={`Select ${profile.name}`}
                    aria-pressed={selected}
                    className={`flex min-w-0 flex-col items-center justify-center rounded-[20px] border px-1 transition active:scale-95 ${
                      selected
                        ? "border-[#8ea682] bg-[#edf4e9] shadow-sm"
                        : "border-white/90 bg-white/70"
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-[15px] text-[11px] font-bold shadow-sm ${colourStyles[profile.colour].avatar}`}
                    >
                      {initialsFor(profile.name)}
                    </span>
                    <span className="mt-1 max-w-full truncate text-[9px] font-bold text-slate-700">
                      {profile.name.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => (profiles.length > 3 ? setProfilesOpen(true) : openNew())}
                disabled={!hydrated || !canManageHousehold}
                className="flex min-w-0 flex-col items-center justify-center rounded-[20px] border border-dashed border-[#b8c7b1] bg-white/45 px-1 text-[#617657] transition active:scale-95 disabled:opacity-40"
                aria-label={profiles.length > 3 ? "Show all household profiles" : "Add household profile"}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-[15px] bg-white/75 text-sm font-semibold shadow-sm">
                  {profiles.length > 3 ? `+${profiles.length - 3}` : <UiIcon name="plus" className="h-4 w-4" />}
                </span>
                <span className="mt-1 text-[9px] font-bold">
                  {profiles.length > 3 ? "More" : "Add"}
                </span>
              </button>
            </div>

            {selectedProfile ? (
              <div className="mt-3 flex min-h-0 flex-1 flex-col rounded-[26px] border border-white/95 bg-[linear-gradient(155deg,rgba(255,255,255,0.95),rgba(244,247,240,0.86))] p-4 shadow-[0_18px_42px_-30px_rgba(34,51,40,0.55)]">
                <div className="flex shrink-0 items-center gap-4">
                  <span
                    className={`flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[24px] text-xl font-bold shadow-[0_14px_28px_-20px_rgba(42,61,47,0.7)] ${colourStyles[selectedProfile.colour].avatar}`}
                  >
                    {initialsFor(selectedProfile.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-xl font-semibold tracking-tight">
                      {selectedProfile.name}
                    </h2>
                    <div className="mt-1 flex min-w-0 items-center gap-2">
                      <p className="min-w-0 truncate text-[11px] text-slate-500">
                        {kindLabels[selectedProfile.kind]}
                        {selectedProfile.relationship ? ` - ${selectedProfile.relationship}` : ""}
                      </p>
                      {selectedProfile.linkedUserId ? (
                        <span className="shrink-0 rounded-full bg-[#e5eee0] px-2 py-1 text-[7px] font-bold uppercase text-[#5c7352]">
                          Account
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {canManageHousehold ? (
                    <button
                      type="button"
                      onClick={() => openEdit(selectedProfile)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-[#5d7553] shadow-sm"
                    >
                      Edit
                    </button>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => canManageHousehold && openEdit(selectedProfile)}
                  className="mt-4 flex h-[58px] shrink-0 items-center rounded-[18px] border border-slate-200/80 bg-white/82 px-3 text-left shadow-sm"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] bg-[#e4ede0] text-[#607657]">
                    <UiIcon name="shield" className="h-4 w-4" />
                  </span>
                  <span className="ml-3 min-w-0 flex-1">
                    <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Access level
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-700">
                      {accessLabels[selectedProfile.appAccess]}
                    </span>
                  </span>
                  {canManageHousehold ? (
                    <UiIcon name="chevron-right" className="h-4 w-4 text-slate-400" />
                  ) : null}
                </button>

                <div className="mt-3 grid min-h-0 flex-1 grid-rows-3 gap-2">
                  {featureDestinations.map((feature) =>
                    feature.enabled ? (
                      <Link
                        key={feature.label}
                        href={feature.href}
                        className="flex min-h-0 items-center rounded-[18px] border border-white/95 bg-white/82 px-3 shadow-sm transition active:scale-[0.98]"
                      >
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] ${feature.tone}`}>
                          <UiIcon name={feature.icon} className="h-4 w-4" />
                        </span>
                        <span className="ml-3 min-w-0 flex-1">
                          <span className="block text-[12px] font-semibold text-slate-800">
                            {feature.label}
                          </span>
                          <span className="mt-0.5 block truncate text-[9px] text-slate-400">
                            {feature.detail}
                          </span>
                        </span>
                        <UiIcon name="chevron-right" className="h-4 w-4 text-slate-400" />
                      </Link>
                    ) : (
                      <button
                        key={feature.label}
                        type="button"
                        onClick={() => openEdit(selectedProfile)}
                        className="flex min-h-0 items-center rounded-[18px] border border-slate-100 bg-slate-50/80 px-3 text-left text-slate-300"
                        aria-label={`Enable ${feature.label} for ${selectedProfile.name}`}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-slate-100">
                          <UiIcon name={feature.icon} className="h-4 w-4" />
                        </span>
                        <span className="ml-3 min-w-0 flex-1">
                          <span className="block text-[12px] font-semibold">{feature.label}</span>
                          <span className="mt-0.5 block truncate text-[9px]">Tap to enable</span>
                        </span>
                        <UiIcon name="chevron-right" className="h-4 w-4" />
                      </button>
                    )
                  )}
                </div>
              </div>
            ) : hydrated ? (
              <div className="mt-3 flex min-h-0 flex-1 flex-col items-center justify-center rounded-[26px] border border-dashed border-[#b8c8af] bg-white/70 px-5 text-center">
                <p className="text-sm font-semibold text-slate-700">Start your household</p>
                <button
                  type="button"
                  onClick={openNew}
                  className="mt-3 rounded-full bg-[#718a65] px-5 py-2.5 text-[10px] font-bold text-white"
                >
                  Add the first profile
                </button>
              </div>
            ) : null}
          </section>

          <section aria-hidden="true" className="hidden">
            <div className="absolute inset-x-0 top-0 h-[calc(100%-168px)] min-h-[310px]">
              <div className="pointer-events-none absolute left-1/2 top-[44%] h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#dfe7da]" />
              <div className="pointer-events-none absolute left-1/2 top-[44%] h-[42%] w-[42%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#d4dfcf]" />
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 h-full w-full text-[#c8d5c2]"
                aria-hidden="true"
              >
                <line x1="50" y1="44" x2="22" y2="18" stroke="currentColor" strokeWidth="0.45" />
                <line x1="50" y1="44" x2="78" y2="18" stroke="currentColor" strokeWidth="0.45" />
                <line x1="50" y1="44" x2="22" y2="69" stroke="currentColor" strokeWidth="0.45" />
                <line x1="50" y1="44" x2="78" y2="69" stroke="currentColor" strokeWidth="0.45" />
              </svg>

              <Link
                href="/family"
                aria-label="Open Family Room"
                className="absolute left-1/2 top-[44%] z-10 flex h-[96px] w-[96px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-[5px] border-white bg-white/94 text-[#52694a] shadow-[0_18px_40px_-22px_rgba(39,58,43,0.65)] transition active:scale-95"
              >
                <UiIcon name="home" className="h-7 w-7" />
                <span className="mt-1 text-[10px] font-bold">Our Home</span>
                <span className="max-w-[74px] truncate text-[7px] text-slate-400">
                  {household?.householdName ?? "DiaryDock"}
                </span>
              </Link>

              {orbitProfiles.map((profile, index) => {
                const selected = selectedProfile?.id === profile.id;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => setSelectedProfileId(profile.id)}
                    aria-label={`Select ${profile.name}`}
                    aria-pressed={selected}
                    className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                    style={orbitPositions[index]}
                  >
                    <span className={`flex h-[66px] w-[66px] items-center justify-center rounded-full border-[5px] border-white text-base font-bold shadow-[0_16px_34px_-20px_rgba(35,53,42,0.72)] transition ${colourStyles[profile.colour].avatar} ${selected ? "ring-2 ring-[#718967] ring-offset-2" : ""}`}>
                      {initialsFor(profile.name)}
                    </span>
                    <span className="mt-1 max-w-[88px] truncate text-[10px] font-bold text-slate-700">
                      {profile.name.split(" ")[0]}
                    </span>
                    <span className="text-[8px] text-slate-400">{kindLabels[profile.kind]}</span>
                  </button>
                );
              })}

              {profiles.length > 4 ? (
                <button
                  type="button"
                  onClick={() => setProfilesOpen(true)}
                  className="absolute bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/90 bg-white/85 px-3 py-1 text-[9px] font-bold text-[#617657] shadow-sm"
                >
                  +{profiles.length - 4} more profiles
                </button>
              ) : null}
            </div>

            {selectedProfile ? (
              <div className="absolute inset-x-3 bottom-3 h-[156px] rounded-[24px] border border-white/95 bg-white/88 p-3 shadow-[0_18px_38px_-27px_rgba(34,51,40,0.58)] backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-bold ${colourStyles[selectedProfile.colour].avatar}`}>
                    {initialsFor(selectedProfile.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-sm font-semibold">{selectedProfile.name}</h2>
                      {selectedProfile.linkedUserId ? (
                        <span className="rounded-full bg-[#e5eee0] px-1.5 py-0.5 text-[7px] font-bold uppercase text-[#5c7352]">
                          Account
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-[9px] text-slate-400">
                      {kindLabels[selectedProfile.kind]}
                      {selectedProfile.relationship ? ` · ${selectedProfile.relationship}` : ""}
                      {" · "}
                      {accessLabels[selectedProfile.appAccess]}
                    </p>
                  </div>
                  {canManageHousehold ? (
                    <button
                      type="button"
                      onClick={() => openEdit(selectedProfile)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-bold text-[#5d7553]"
                    >
                      Edit
                    </button>
                  ) : null}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {featureDestinations.map((feature) =>
                    feature.enabled ? (
                      <Link
                        key={feature.label}
                        href={feature.href}
                        className="rounded-2xl border border-[#d8e4d3] bg-[#edf4e9] px-2 py-2 text-center text-[#5d7653] transition active:scale-95"
                      >
                        <UiIcon name={feature.icon} className="mx-auto h-4 w-4" />
                        <span className="mt-1 block text-[8px] font-bold">{feature.label}</span>
                      </Link>
                    ) : (
                      <button
                        key={feature.label}
                        type="button"
                        onClick={() => openEdit(selectedProfile)}
                        className="rounded-2xl border border-slate-100 bg-slate-50 px-2 py-2 text-center text-slate-300"
                        aria-label={`Enable ${feature.label} for ${selectedProfile.name}`}
                      >
                        <UiIcon name={feature.icon} className="mx-auto h-4 w-4" />
                        <span className="mt-1 block text-[8px] font-bold">{feature.label}</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            ) : hydrated ? (
              <div className="absolute inset-x-5 bottom-8 rounded-[24px] border border-dashed border-[#b8c8af] bg-white/80 px-5 py-6 text-center">
                <p className="text-sm font-semibold text-slate-700">Start your household</p>
                <button type="button" onClick={openNew} className="mt-2 rounded-full bg-[#718a65] px-4 py-2 text-[10px] font-bold text-white">
                  Add the first profile
                </button>
              </div>
            ) : null}
          </section>
        </main>
      </div>

      <ModalShell
        open={editorOpen}
        title={editingId ? "Edit profile" : "Add someone"}
        subtitle="Choose where this person should appear in DiaryDock."
        onClose={closeEditor}
        footer={
          <button
            type="button"
            onClick={saveProfile}
            className="w-full rounded-2xl bg-[#24372f] px-4 py-3 text-sm font-semibold text-white shadow-sm"
          >
            Save profile
          </button>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <label className="col-span-2 space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Name</span>
              <input
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="Name"
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#789469]"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Profile type</span>
              <select
                value={draft.kind}
                onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value as HouseholdProfile["kind"] }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none"
              >
                {Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Relationship</span>
              <input
                value={draft.relationship}
                onChange={(event) => setDraft((current) => ({ ...current, relationship: event.target.value }))}
                placeholder="Partner, daughter..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none"
              />
            </label>
          </div>

          <div>
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Profile colour</p>
            <div className="mt-2 flex gap-2">
              {colours.map((colour) => (
                <button
                  key={colour}
                  type="button"
                  onClick={() => setDraft((current) => ({ ...current, colour }))}
                  aria-label={`Use ${colour}`}
                  className={`h-9 w-9 rounded-full border-2 border-white shadow-sm ${colourStyles[colour].dot} ${draft.colour === colour ? "ring-2 ring-[#4d6246]" : ""}`}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Show this person in</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {([
                ["showInSchedules", "Schedules", "calendar"],
                ["showInMeals", "Meals", "home"],
                ["showInReminders", "Reminders", "check"]
              ] as const).map(([key, label, icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleSurface(key)}
                  aria-pressed={draft[key]}
                  className={`rounded-2xl border px-2 py-3 text-center text-[9px] font-semibold ${draft[key] ? "border-[#91a887] bg-[#e7efe2] text-[#526b49]" : "border-slate-200 bg-white text-slate-400"}`}
                >
                  <UiIcon name={icon} className="mx-auto mb-1 h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">App access</span>
            <select
              value={draft.appAccess}
              onChange={(event) => setDraft((current) => ({ ...current, appAccess: event.target.value as HouseholdProfile["appAccess"] }))}
              disabled={Boolean(profiles.find((profile) => profile.id === editingId)?.linkedUserId)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none disabled:bg-slate-50"
            >
              {Object.entries(accessLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <p className="text-[10px] leading-4 text-slate-400">
              Profiles do not create accounts. Send an invitation separately if app access is needed.
            </p>
          </label>

          {message ? <p className="text-xs font-semibold text-red-600">{message}</p> : null}

          {editingId &&
          !editingId.startsWith("schedule-profile-") &&
          !profiles.find((profile) => profile.id === editingId)?.linkedUserId ? (
            <button type="button" onClick={deleteProfile} className="text-xs font-semibold text-red-500">
              Remove this profile
            </button>
          ) : null}
        </div>
      </ModalShell>

      <ModalShell
        open={profilesOpen}
        title="Everyone at home"
        subtitle="Select a person to view their DiaryDock spaces."
        onClose={() => setProfilesOpen(false)}
      >
        <div className="grid grid-cols-2 gap-3">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              onClick={() => selectProfile(profile.id)}
              className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
                selectedProfile?.id === profile.id
                  ? "border-[#8fa484] bg-[#edf4e9]"
                  : "border-slate-200 bg-white"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-bold ${colourStyles[profile.colour].avatar}`}
              >
                {initialsFor(profile.name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-slate-800">
                  {profile.name}
                </span>
                <span className="block text-[9px] text-slate-400">
                  {kindLabels[profile.kind]}
                </span>
              </span>
            </button>
          ))}
        </div>
        {canManageHousehold ? (
          <button
            type="button"
            onClick={() => {
              setProfilesOpen(false);
              openNew();
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#263b35] px-4 py-3 text-xs font-semibold text-white"
          >
            <UiIcon name="plus" className="h-4 w-4" />
            Add another person
          </button>
        ) : null}
      </ModalShell>

      <BottomNav />
    </>
  );
}
