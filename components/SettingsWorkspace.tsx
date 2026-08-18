"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { ModalShell } from "@/components/ModalShell";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { UiIcon } from "@/components/UiIcon";
import { vaultSecurity } from "@/lib/mock-data";

type ProfileDraft = {
  name: string;
  email: string;
  plan: string;
};

type DataModalMode = "profile" | "export" | "delete" | null;

type ForwardingAddressState =
  | { status: "loading" }
  | { status: "ready"; address: string; copied: boolean }
  | { status: "not-configured"; message: string }
  | { status: "error"; message: string };

function toggleRow(rows: typeof import("@/lib/diarydock-data").initialSettingGroups[number]["rows"], label: string) {
  return rows.map((row) =>
    row.kind === "toggle" && row.label === label ? { ...row, value: !row.value } : row
  );
}

export function SettingsWorkspace() {
  const { state, repositoryMode, updateState } = useDiaryDockData();
  const profileState = state.settingsProfile;
  const groups = state.settingsGroups;
  const [modal, setModal] = useState<DataModalMode>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteRequestBusy, setDeleteRequestBusy] = useState(false);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [forwardingAddress, setForwardingAddress] = useState<ForwardingAddressState>({ status: "loading" });
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

  useEffect(() => {
    let cancelled = false;

    async function loadForwardingAddress() {
      try {
        const response = await fetch("/api/import/email-address", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as
          | { configured?: boolean; address?: string; message?: string; error?: string }
          | null;

        if (cancelled) return;

        if (!response.ok) {
          setForwardingAddress({ status: "error", message: payload?.error ?? "Email forwarding is not available yet." });
          return;
        }

        if (payload?.configured && payload.address) {
          setForwardingAddress({ status: "ready", address: payload.address, copied: false });
          return;
        }

        setForwardingAddress({
          status: "not-configured",
          message: payload?.message ?? "Email forwarding needs the production mail provider connected."
        });
      } catch {
        if (!cancelled) {
          setForwardingAddress({ status: "error", message: "Unable to check the forwarding address right now." });
        }
      }
    }

    void loadForwardingAddress();

    return () => {
      cancelled = true;
    };
  }, []);

  const copyForwardingAddress = async () => {
    if (forwardingAddress.status !== "ready") return;

    await navigator.clipboard.writeText(forwardingAddress.address);
    setForwardingAddress({ ...forwardingAddress, copied: true });
  };

  const closeModal = () => {
    setModal(null);
    setDeleteConfirm("");
    setDeleteRequestBusy(false);
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

      if (!response.ok) {
        setRequestMessage(payload?.error ?? "Unable to record the deletion request. Please contact support.");
        return;
      }

      setRequestMessage(
        payload?.message ??
          "Your account deletion request has been recorded. We will verify ownership and process eligible data within 30 days."
      );
    } catch {
      setRequestMessage("Unable to contact DiaryDock support services. Please try again or email hello@diarydock.com.");
    } finally {
      setDeleteRequestBusy(false);
    }
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

            <Link href="/cookies" className="flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-white/60">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sage/45 text-moss">
                <UiIcon name="gear" className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">Cookie Policy</span>
                <span className="mt-0.5 block text-xs text-ink/50">Essential cookies and local storage</span>
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

            <div className="flex items-start gap-3.5 px-4 py-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sage/55 text-moss">
                <UiIcon name="mail" className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">Email forwarding</p>
                {forwardingAddress.status === "ready" ? (
                  <>
                    <p className="mt-0.5 break-all text-xs text-ink/55">{forwardingAddress.address}</p>
                    <p className="mt-1 text-xs leading-5 text-ink/45">
                      Forward emails with PDF or image attachments here and DiaryDock will save them for review.
                    </p>
                  </>
                ) : (
                  <p className="mt-0.5 text-xs leading-5 text-ink/50">
                    {forwardingAddress.status === "loading"
                      ? "Checking your private forwarding address…"
                      : forwardingAddress.message}
                  </p>
                )}
              </div>
              {forwardingAddress.status === "ready" ? (
                <button
                  type="button"
                  onClick={() => void copyForwardingAddress()}
                  className="shrink-0 rounded-full border border-ink/15 bg-white/80 px-3 py-1.5 text-xs font-semibold text-ink/65 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-moss"
                >
                  {forwardingAddress.copied ? "Copied" : "Copy"}
                </button>
              ) : null}
            </div>

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
                <span className="mt-0.5 block text-xs text-ink/50">Ask us to delete your account and data</span>
              </span>
              <UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-ink/30" />
            </button>

            <Link href="/account-deletion" className="flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-white/60">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blush text-orange-700">
                <UiIcon name="file" className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">Deletion information</span>
                <span className="mt-0.5 block text-xs text-ink/50">What is deleted and how long it takes</span>
              </span>
              <UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-ink/30" />
            </Link>
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
                {vaultSecurity.devices} trusted devices can open the estate and All Files.
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
            <a href="mailto:hello@diarydock.com?subject=DiaryDock%20support" className="flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-white/60">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sage/55 text-moss">
                <UiIcon name="mail" className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">Email support</p>
                <p className="mt-0.5 text-xs text-ink/50">hello@diarydock.com</p>
              </div>
              <UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-ink/30" />
            </a>
            <Link href="/support" className="flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-white/60">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">Support centre</p>
                <p className="mt-0.5 text-xs text-ink/50">Account, privacy, and app help</p>
              </div>
              <UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-ink/30" />
            </Link>
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
              : "Ask DiaryDock to delete your account and eligible personal data."
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
              onClick={modal === "profile" ? saveProfile : modal === "export" ? exportData : () => void requestDeletion()}
              disabled={deleteRequestBusy}
              className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-ink/90 disabled:cursor-wait disabled:opacity-60"
            >
              {modal === "profile"
                ? "Save profile"
                : modal === "export"
                  ? "Download export"
                  : deleteRequestBusy
                    ? "Recording request…"
                    : "Record request"}
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
              <p className="text-sm font-semibold text-orange-800">Deletion is reviewed before processing</p>
              <p className="mt-1 text-xs leading-5 text-orange-700">
                We verify account ownership first, then delete eligible account data and uploaded content within 30 days.
                Some records may remain briefly in backups or where legally required.
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
