import type { Dispatch, SetStateAction } from "react";

import { ModalShell } from "@/components/ModalShell";
import type {
  DataModalMode,
  ProfileDraft,
} from "@/components/settings/settings-model";

export function SettingsDataModal({
  busy,
  deleteConfirm,
  mode,
  onClose,
  onDeleteConfirmChange,
  onExport,
  onRequestDeletion,
  onSaveProfile,
  profileDraft,
  requestMessage,
  setProfileDraft,
}: {
  busy: boolean;
  deleteConfirm: string;
  mode: DataModalMode;
  onClose: () => void;
  onDeleteConfirmChange: (value: string) => void;
  onExport: () => void;
  onRequestDeletion: () => void;
  onSaveProfile: () => void;
  profileDraft: ProfileDraft;
  requestMessage: string | null;
  setProfileDraft: Dispatch<SetStateAction<ProfileDraft>>;
}) {
  const title =
    mode === "profile"
      ? "Edit profile"
      : mode === "export"
        ? "Export your data"
        : "Request account deletion";
  const subtitle =
    mode === "profile"
      ? "Stored through the DiaryDock data layer."
      : mode === "export"
        ? "Prepare a local JSON copy of this DiaryDock estate."
        : "Ask DiaryDock to delete your account and eligible personal data.";
  const action =
    mode === "profile"
      ? onSaveProfile
      : mode === "export"
        ? onExport
        : onRequestDeletion;
  const actionLabel =
    mode === "profile"
      ? "Save profile"
      : mode === "export"
        ? "Download export"
        : busy
          ? "Recording request…"
          : "Record request";
  return (
    <ModalShell
      open={mode !== null}
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold text-ink/60 transition hover:bg-white hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={action}
            disabled={busy}
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-ink/90 disabled:cursor-wait disabled:opacity-60"
          >
            {actionLabel}
          </button>
        </div>
      }
    >
      {mode === "profile" ? (
        <div className="space-y-4">
          <ProfileField
            label="Name"
            value={profileDraft.name}
            onChange={(name) =>
              setProfileDraft((current) => ({ ...current, name }))
            }
          />
          <ProfileField
            email
            label="Email"
            value={profileDraft.email}
            onChange={(email) =>
              setProfileDraft((current) => ({ ...current, email }))
            }
          />
        </div>
      ) : null}
      {mode === "export" ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-black/10 bg-white/72 px-4 py-3">
            <p className="text-sm font-semibold text-ink">
              Included in this export
            </p>
            <p className="mt-1 text-xs leading-5 text-ink/55">
              Profile details, document metadata, reminders, household members,
              family invites, emergency contacts, emergency plans, and home
              notes. Original uploaded files are not bundled in this MVP export.
            </p>
          </div>
          {requestMessage ? (
            <p className="rounded-2xl bg-sage/45 px-4 py-3 text-sm text-moss">
              {requestMessage}
            </p>
          ) : null}
        </div>
      ) : null}
      {mode === "delete" ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3">
            <p className="text-sm font-semibold text-orange-800">
              Deletion is reviewed before processing
            </p>
            <p className="mt-1 text-xs leading-5 text-orange-700">
              We verify account ownership first, then delete eligible account
              data and uploaded content within 30 days. Some records may remain
              briefly in backups or where legally required.
            </p>
          </div>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink">
              Type DELETE to confirm
            </span>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(event) => onDeleteConfirmChange(event.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
            />
          </label>
          {requestMessage ? (
            <p className="rounded-2xl bg-white/72 px-4 py-3 text-sm text-ink/62">
              {requestMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </ModalShell>
  );
}

function ProfileField({
  email,
  label,
  onChange,
  value,
}: {
  email?: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <input
        type={email ? "email" : "text"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
      />
    </label>
  );
}
