"use client";

import { useMemo, useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { PageHeader } from "@/components/PageHeader";
import { SettingsDataModal } from "@/components/settings/SettingsDataModal";
import {
  SettingsDashboardAreas,
  SettingsGroups,
  SettingsProfilePanel,
  SettingsStatus,
  SettingsStoragePanel,
  SettingsSupport
} from "@/components/settings/SettingsPanels";
import { SettingsPrivacySection } from "@/components/settings/SettingsPrivacySection";
import { toggleSettingRows, type DataModalMode, type ProfileDraft } from "@/components/settings/settings-model";
import { useSettingsRemoteState } from "@/components/settings/use-settings-remote-state";
import { OPTIONAL_DASHBOARD_AREAS, normaliseDashboardAreaIds } from "@/lib/dashboard-areas";

export function SettingsWorkspace() {
  const { state, repositoryMode, updateState } = useDiaryDockData();
  const profile = state.settingsProfile;
  const [modal, setModal] = useState<DataModalMode>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteRequestBusy, setDeleteRequestBusy] = useState(false);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({ name: profile.name, email: profile.email });
  const { copyForwardingAddress, forwardingAddress, storageSummary } = useSettingsRemoteState(repositoryMode);

  const reviewQueue = state.vaultDocuments.filter((document) => document.reviewStatus === "needs-review");
  const emailedReviewCount = reviewQueue.filter((document) =>
    document.roomId === "mailbox" || document.roomName === "Mailbox" || document.reviewReasons?.some((reason) => reason.toLowerCase().includes("email"))
  ).length;
  const enabledToggles = useMemo(() => state.settingsGroups.reduce(
    (count, group) => count + group.rows.filter((row) => row.kind === "toggle" && row.value).length,
    0
  ), [state.settingsGroups]);

  const closeModal = () => {
    setModal(null);
    setDeleteConfirm("");
    setDeleteRequestBusy(false);
    setRequestMessage(null);
    setProfileDraft({ name: profile.name, email: profile.email });
  };

  const exportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: "DiaryDock",
      profile: state.settingsProfile,
      documents: state.vaultDocuments,
      reminders: state.reminders,
      familyInvites: state.familyInvites,
      householdMembers: state.householdMembers,
      emergencyContacts: state.emergencyContacts,
      emergencyPlans: state.emergencyPlans,
      homeInfo: state.homeInfo
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `diarydock-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setRequestMessage("Your DiaryDock export has been prepared as a JSON file.");
  };

  const requestDeletion = async () => {
    if (deleteConfirm.trim().toUpperCase() !== "DELETE") {
      setRequestMessage("Type DELETE to confirm the account deletion request.");
      return;
    }
    setDeleteRequestBusy(true);
    setRequestMessage(null);
    try {
      const response = await fetch("/api/account/deletion/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: deleteConfirm })
      });
      const payload = await response.json().catch(() => null) as { message?: string; error?: string } | null;
      setRequestMessage(response.ok
        ? payload?.message ?? "Your account deletion request has been recorded. We will verify ownership and process eligible data within 30 days."
        : payload?.error ?? "Unable to record the deletion request. Please contact support.");
    } catch {
      setRequestMessage("Unable to contact DiaryDock support services. Please try again or email hello@diarydock.com.");
    } finally {
      setDeleteRequestBusy(false);
    }
  };

  const saveProfile = () => {
    const name = profileDraft.name.trim();
    const email = profileDraft.email.trim();
    if (!name || !email) return;
    updateState((current) => ({ ...current, settingsProfile: { ...current.settingsProfile, name, email } }));
    closeModal();
  };

  const toggleDashboardArea = (roomId: string) => {
    updateState((current) => {
      const existing = current.onboarding.dashboardAreasConfigured
        ? current.onboarding.selectedRooms
        : normaliseDashboardAreaIds(OPTIONAL_DASHBOARD_AREAS.map((area) => area.roomId));
      const selectedRooms = existing.includes(roomId) ? existing.filter((id) => id !== roomId) : [...existing, roomId];
      return { ...current, onboarding: { ...current.onboarding, dashboardAreasConfigured: true, selectedRooms: normaliseDashboardAreaIds(selectedRooms) } };
    });
  };

  const flipToggle = (groupTitle: string, label: string) => updateState((current) => ({
    ...current,
    settingsGroups: current.settingsGroups.map((group) => group.title === groupTitle ? { ...group, rows: toggleSettingRows(group.rows, label) } : group)
  }));

  return (
    <>
      <div className="immersive-page">
        <PageHeader
          eyebrow="Settings"
          title="Your Settings, Your Peace of Mind"
          subtitle="Personalize your experience and stay protected."
          heroImage="/images/pages/settings-hero.webp"
          heroPosition="center 50%"
          badge="Estate control"
          action={(
            <span className="hidden rounded-full border border-white/30 bg-white/14 px-3 py-1 text-[11px] font-semibold text-white/80 backdrop-blur-md sm:inline-flex">
              {repositoryMode === "supabase" ? "Secure sync" : "Local session"}
            </span>
          )}
        />
        <SettingsProfilePanel profile={profile} onEdit={() => setModal("profile")} />
        <SettingsStoragePanel summary={storageSummary} />
        <SettingsDashboardAreas onboarding={state.onboarding} onToggle={toggleDashboardArea} />
        <SettingsGroups groups={state.settingsGroups} onToggle={flipToggle} />
        <SettingsPrivacySection
          emailedReviewCount={emailedReviewCount}
          forwardingAddress={forwardingAddress}
          onCopy={() => void copyForwardingAddress()}
          onDelete={() => setModal("delete")}
          onExport={() => setModal("export")}
          reviewCount={reviewQueue.length}
        />
        <SettingsStatus enabledToggles={enabledToggles} />
        <SettingsSupport />
      </div>
      <SettingsDataModal
        busy={deleteRequestBusy}
        deleteConfirm={deleteConfirm}
        mode={modal}
        onClose={closeModal}
        onDeleteConfirmChange={setDeleteConfirm}
        onExport={exportData}
        onRequestDeletion={() => void requestDeletion()}
        onSaveProfile={saveProfile}
        profileDraft={profileDraft}
        requestMessage={requestMessage}
        setProfileDraft={setProfileDraft}
      />
    </>
  );
}
