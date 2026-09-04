"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { BottomNav } from "@/components/BottomNav";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { HouseholdProfileOrbit } from "@/components/household-profiles/HouseholdProfileOrbit";
import {
  buildHouseholdProfiles,
  canRemoveProfile,
  emptyProfileDraft,
  profileColours,
  type ProfileDraft
} from "@/components/household-profiles/household-profile-model";
import { ProfileEditorModal, freshProfileDraft } from "@/components/household-profiles/ProfileEditorModal";
import { buildProfileDestinations } from "@/components/household-profiles/profile-destinations";
import { ProfileRoster } from "@/components/household-profiles/ProfileRoster";
import { ProfilesPickerModal } from "@/components/household-profiles/ProfilesPickerModal";
import { SelectedProfileCard } from "@/components/household-profiles/SelectedProfileCard";
import { UiIcon } from "@/components/UiIcon";
import type { HouseholdProfile } from "@/lib/diarydock-data";

export function HouseholdProfilesWorkspace() {
  const { state, household, hydrated, canManageHousehold, updateState } = useDiaryDockData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProfileDraft>(emptyProfileDraft);
  const [editorOpen, setEditorOpen] = useState(false);
  const [profilesOpen, setProfilesOpen] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
    };
  }, []);

  const profiles = useMemo(
    () =>
      buildHouseholdProfiles({
        householdMembers: state.householdMembers,
        householdProfiles: state.householdProfiles,
        kidSchedules: state.kidSchedules
      }),
    [state.householdMembers, state.householdProfiles, state.kidSchedules]
  );
  const selectedProfile =
    profiles.find((profile) => profile.id === selectedProfileId) ?? profiles[0] ?? null;
  const editingProfile = profiles.find((profile) => profile.id === editingId);
  const destinations = selectedProfile
    ? buildProfileDestinations(selectedProfile, state)
    : [];

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
    setDraft(emptyProfileDraft);
    setMessage("");
  };
  const openNew = () => {
    if (!canManageHousehold) return;
    setEditingId(null);
    setDraft(freshProfileDraft(profileColours[profiles.length % profileColours.length]));
    setMessage("");
    setEditorOpen(true);
  };
  const openEdit = (profile: HouseholdProfile) => {
    if (!canManageHousehold) return;
    const { id, linkedUserId, ...nextDraft } = profile;
    void id;
    void linkedUserId;
    setEditingId(profile.id);
    setDraft(nextDraft);
    setMessage("");
    setEditorOpen(true);
  };
  const saveProfile = () => {
    if (!canManageHousehold) return;
    const name = draft.name.trim();
    if (!name) {
      setMessage("Add this person's name.");
      return;
    }
    const profile: HouseholdProfile = {
      ...draft,
      id: editingId ?? crypto.randomUUID(),
      name,
      relationship: draft.relationship.trim(),
      linkedUserId: editingProfile?.linkedUserId
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
    if (!canManageHousehold || !canRemoveProfile(editingProfile)) return;
    updateState((current) => ({
      ...current,
      householdProfiles: current.householdProfiles.filter((profile) => profile.id !== editingId)
    }));
    if (selectedProfileId === editingId) setSelectedProfileId(null);
    closeEditor();
  };
  const selectProfile = (profileId: string) => {
    setSelectedProfileId(profileId);
    setProfilesOpen(false);
  };

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
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#66805c]">Family Room</p>
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
            <ProfileRoster
              canManage={canManageHousehold}
              hydrated={hydrated}
              onAdd={openNew}
              onOpenAll={() => setProfilesOpen(true)}
              onSelect={setSelectedProfileId}
              profiles={profiles}
              selectedId={selectedProfile?.id}
            />
            {selectedProfile ? (
              <SelectedProfileCard
                canManage={canManageHousehold}
                destinations={destinations}
                onEdit={() => openEdit(selectedProfile)}
                profile={selectedProfile}
              />
            ) : hydrated ? (
              <div className="mt-3 flex min-h-0 flex-1 flex-col items-center justify-center rounded-[26px] border border-dashed border-[#b8c8af] bg-white/70 px-5 text-center">
                <p className="text-sm font-semibold text-slate-700">Start your household</p>
                <button type="button" onClick={openNew} className="mt-3 rounded-full bg-[#718a65] px-5 py-2.5 text-[10px] font-bold text-white">
                  Add the first profile
                </button>
              </div>
            ) : null}
          </section>

          <HouseholdProfileOrbit
            canManage={canManageHousehold}
            destinations={destinations}
            householdName={household?.householdName ?? "DiaryDock"}
            hydrated={hydrated}
            onAdd={openNew}
            onEdit={() => selectedProfile && openEdit(selectedProfile)}
            onOpenAll={() => setProfilesOpen(true)}
            onSelect={setSelectedProfileId}
            profiles={profiles}
            selectedProfile={selectedProfile}
          />
        </main>
      </div>

      <ProfileEditorModal
        draft={draft}
        editingProfile={editingProfile}
        message={message}
        onClose={closeEditor}
        onDelete={deleteProfile}
        onSave={saveProfile}
        open={editorOpen}
        removable={canRemoveProfile(editingProfile)}
        setDraft={setDraft}
      />
      <ProfilesPickerModal
        canManage={canManageHousehold}
        onAdd={() => {
          setProfilesOpen(false);
          openNew();
        }}
        onClose={() => setProfilesOpen(false)}
        onSelect={selectProfile}
        open={profilesOpen}
        profiles={profiles}
        selectedId={selectedProfile?.id}
      />
      <BottomNav />
    </>
  );
}
