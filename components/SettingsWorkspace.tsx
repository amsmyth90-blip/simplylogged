"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { useLifeDockData } from "@/components/LifeDockDataProvider";
import { ModalShell } from "@/components/ModalShell";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { UiIcon, type IconName } from "@/components/UiIcon";
import { vaultSecurity } from "@/lib/mock-data";

type ProfileDraft = {
  name: string;
  email: string;
  plan: string;
};

type DataModalMode = "profile" | "export" | "delete" | null;

function toggleRow(rows: typeof import("@/lib/lifedock-data").initialSettingGroups[number]["rows"], label: string) {
  return rows.map((row) =>
    row.kind === "toggle" && row.label === label ? { ...row, value: !row.value } : row
  );
}

export function SettingsWorkspace() {
  const { state, repositoryMode, updateState } = useLifeDockData();
  const profileState = state.settingsProfile;
  const groups = state.settingsGroups;
  const [modal, setModal] = useState<DataModalMode>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({
    name: profileState.name,
    email: profileState.email,
    plan: profileState.plan
  });

  const enabledToggles = useMemo(
    () =>
      groups.reduce(
        (count, group) => count + group.rows.filter((row) => row.kind === "toggle" && row.value).length,
        0
      ),
    [groups]
  );

  const closeModal = () => {
    setModal(null);
    setDeleteConfirm("");
    setRequestMessage(null);
    setProfileDraft({
      name: profileState.name,
      email: profileState.email,
      plan: profileState.plan
    });
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

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `diarydock-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setRequestMessage("Your DiaryDock export has been prepared as a JSON file.");
  };

  const requestDeletion = () => {
    if (deleteConfirm.trim().toUpperCase() !== "DELETE") {
      setRequestMessage("Type DELETE to confirm the account deletion request.");
      return;
    }

    setRequestMessage(
      "Deletion request recorded for MVP testing. Before public launch this should create a support ticket and start a formal retention window."
    );
  };

  const saveProfile = () => {
    const name = profileDraft.name.trim();
    const email = profileDraft.email.trim();
    const plan = profileDraft.plan.trim();

    if (!name || !email || !plan) {
      return;
    }

    updateState((current) => ({
      ...current,
      settingsProfile: { ...current.settingsProfile, name, email, plan }
    }));
    closeModal();
  };

  const flipToggle = (groupTitle: string, label: string) => {
    updateState((current) => ({
      ...current,
      settingsGroups: current.settingsGroups.map((group) =>
        group.title === groupTitle ? { ...group, rows: toggleRow(group.rows, label) } : group
      )
    }));
  };

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
          action={
            <span className="hidden rounded-full border border-white/30 bg-white/14 px-3 py-1 text-[11px] font-semibold text-white/80 backdrop-blur-md sm:inline-flex">
              {repositoryMode === "supabase" ? "Supabase live" : "Session demo"}
            </span>
          }
        />

        <section className="estate-sheet flex items-center gap-4 p-5">
          <Avatar initials={profileState.initials} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold tracking-tight text-ink">{profileState.name}</h2>
            <p className="mt-0.5 truncate text-sm text-ink/55">{profileState.email}</p>
            <p className="mt-1 text-xs text-ink/45">
              {profileState.plan} - Member since {profileState.memberSince}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModal("profile")}
            className="shrink-0 rounded-full border border-ink/15 bg-white/80 px-4 py-2 text-xs font-semibold text-ink/70 transition hover:bg-white"
          >
            Edit
          </button>
        </section>

        {groups.map((group) => (
          <section key={group.title} className="space-y-3">
            <SectionHeader title={group.title} />
            <div className="estate-sheet divide-y divide-white/60 overflow-hidden">
              {group.rows.map((row) => {
                const body = (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{row.label}</p>
                      {row.hint ? <p className="mt-0.5 text-xs text-ink/50">{row.hint}</p> : null}
                    </div>
                    {row.kind === "toggle" ? (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={row.value}
                        aria-label={row.label}
                        onClick={() => flipToggle(group.title, row.label)}
                        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${
                          row.value ? "bg-moss" : "bg-slate-300/80"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-all duration-200 ${
                            row.value ? "left-[22px]" : "left-0.5"
                          }`}
                        />
                      </button>
                    ) : row.kind === "value" ? (
                      <span className="shrink-0 rounded-full bg-mist px-3 py-1 text-xs font-semibold text-ink/60">
                        {row.value}
                      </span>
                    ) : (
                      <UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-ink/30" />
                    )}
                  </>
                );

                return row.kind === "link" ? (
                  <Link
                    key={row.label}
                    href={row.href}
                    className="flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-white/60"
                  >
                    {body}
                  </Link>
                ) : (
                  <div key={row.label} className="flex items-center gap-3.5 px-4 py-3.5">
                    {body}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <section className="space-y-3">
          <SectionHeader title="Privacy, terms & data" hint="App Store readiness controls" />
          <div className="estate-sheet divide-y divide-white/60 overflow-hidden">
            <Link href="/privacy" className="flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-white/60">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sage/55 text-moss">
                <UiIcon name="shield" className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">Privacy Policy</span>
                <span className="mt-0.5 block text-xs text-ink/50">How DiaryDock handles family and document data</span>
              </span>
              <UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-ink/30" />
            </Link>

            <Link href="/terms" className="flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-white/60">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mist text-sky-700">
                <UiIcon name="file" className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">Terms of Use</span>
                <span className="mt-0.5 block text-xs text-ink/50">Early product terms and user responsibility</span>
              </span>
              <UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-ink/30" />
            </Link>

            <button
              type="button"
              onClick={() => setModal("export")}
              className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition hover:bg-white/60"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/30 text-yellow-800">
                <UiIcon name="archive" className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">Export my data</span>
                <span className="mt-0.5 block text-xs text-ink/50">Download a JSON copy of this DiaryDock estate</span>
              </span>
              <UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-ink/30" />
            </button>

            <button
              type="button"
              onClick={() => setModal("delete")}
              className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition hover:bg-white/60"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blush text-orange-700">
                <UiIcon name="alert" className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">Request account deletion</span>
                <span className="mt-0.5 block text-xs text-ink/50">MVP-safe deletion request flow</span>
              </span>
              <UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-ink/30" />
            </button>
          </div>
        </section>

        <section className="estate-sheet p-5">
          <SectionHeader title="DiaryDock status" hint="At-a-glance confidence checks" />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl bg-white/65 p-4">
              <p className="text-sm font-semibold text-ink">Backups</p>
              <p className="mt-1 text-xs leading-5 text-ink/55">
                Nightly backup is on and last completed {vaultSecurity.lastBackup.toLowerCase()}.
              </p>
            </div>
            <div className="rounded-3xl bg-white/65 p-4">
              <p className="text-sm font-semibold text-ink">Devices</p>
              <p className="mt-1 text-xs leading-5 text-ink/55">
                {vaultSecurity.devices} trusted devices can open the estate and the Vault.
              </p>
            </div>
            <div className="rounded-3xl bg-white/65 p-4">
              <p className="text-sm font-semibold text-ink">Preferences</p>
              <p className="mt-1 text-xs leading-5 text-ink/55">
                {enabledToggles} live preferences are currently switched on for this household.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader title="Support" />
          <div className="estate-sheet divide-y divide-white/60 overflow-hidden">
            <div className="flex items-center gap-3.5 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">Help centre</p>
                <p className="mt-0.5 text-xs text-ink/50">Guides for rooms, the Vault, and sharing</p>
              </div>
              <UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-ink/30" />
            </div>
            <div className="flex items-center gap-3.5 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">App version</p>
              </div>
              <span className="text-xs font-medium text-ink/45">DiaryDock 0.1.0</span>
            </div>
          </div>
        </section>

      </div>

      <ModalShell
        open={modal !== null}
        title={
          modal === "profile"
            ? "Edit profile"
            : modal === "export"
              ? "Export your data"
              : "Request account deletion"
        }
        subtitle={
          modal === "profile"
            ? "Stored through the DiaryDock data layer."
            : modal === "export"
              ? "Prepare a local JSON copy of this DiaryDock estate."
              : "This records a deletion request for MVP testing."
        }
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
              onClick={modal === "profile" ? saveProfile : modal === "export" ? exportData : requestDeletion}
              className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-ink/90"
            >
              {modal === "profile" ? "Save profile" : modal === "export" ? "Download export" : "Record request"}
            </button>
          </div>
        }
      >
        {modal === "profile" ? (
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink">Name</span>
            <input
              type="text"
              value={profileDraft.name}
              onChange={(event) => setProfileDraft((current) => ({ ...current, name: event.target.value }))}
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink">Email</span>
            <input
              type="email"
              value={profileDraft.email}
              onChange={(event) => setProfileDraft((current) => ({ ...current, email: event.target.value }))}
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink">Plan label</span>
            <input
              type="text"
              value={profileDraft.plan}
              onChange={(event) => setProfileDraft((current) => ({ ...current, plan: event.target.value }))}
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
            />
          </label>
        </div>
        ) : null}

        {modal === "export" ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-black/10 bg-white/72 px-4 py-3">
              <p className="text-sm font-semibold text-ink">Included in this export</p>
              <p className="mt-1 text-xs leading-5 text-ink/55">
                Profile details, document metadata, reminders, household members, family invites, emergency contacts,
                emergency plans, and home notes. Original uploaded files are not bundled in this MVP export.
              </p>
            </div>
            {requestMessage ? <p className="rounded-2xl bg-sage/45 px-4 py-3 text-sm text-moss">{requestMessage}</p> : null}
          </div>
        ) : null}

        {modal === "delete" ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3">
              <p className="text-sm font-semibold text-orange-800">Deletion is not instant in MVP testing</p>
              <p className="mt-1 text-xs leading-5 text-orange-700">
                This records the user's intention. Before public launch, this should connect to a real deletion workflow,
                retention period, and confirmation email.
              </p>
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Type DELETE to confirm</span>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(event) => setDeleteConfirm(event.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              />
            </label>
            {requestMessage ? <p className="rounded-2xl bg-white/72 px-4 py-3 text-sm text-ink/62">{requestMessage}</p> : null}
          </div>
        ) : null}
      </ModalShell>
    </>
  );
}
