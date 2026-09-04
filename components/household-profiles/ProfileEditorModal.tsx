import type { Dispatch, SetStateAction } from "react";

import {
  emptyProfileDraft,
  profileAccessLabels,
  profileColours,
  profileColourStyles,
  profileKindLabels,
  type ProfileDraft,
  type ProfileSurfaceKey
} from "@/components/household-profiles/household-profile-model";
import { ModalShell } from "@/components/ModalShell";
import { UiIcon } from "@/components/UiIcon";
import type { HouseholdProfile } from "@/lib/diarydock-data";

type ProfileEditorModalProps = {
  draft: ProfileDraft;
  editingProfile?: HouseholdProfile;
  message: string;
  onClose: () => void;
  onDelete: () => void;
  onSave: () => void;
  open: boolean;
  removable: boolean;
  setDraft: Dispatch<SetStateAction<ProfileDraft>>;
};

const surfaceOptions = [
  ["showInSchedules", "Schedules", "calendar"],
  ["showInMeals", "Meals", "home"],
  ["showInReminders", "Reminders", "check"]
] as const;

export function ProfileEditorModal({
  draft,
  editingProfile,
  message,
  onClose,
  onDelete,
  onSave,
  open,
  removable,
  setDraft
}: ProfileEditorModalProps) {
  const updateDraft = <Key extends keyof ProfileDraft>(key: Key, value: ProfileDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const toggleSurface = (key: ProfileSurfaceKey) => updateDraft(key, !draft[key]);

  return (
    <ModalShell
      open={open}
      title={editingProfile ? "Edit profile" : "Add someone"}
      subtitle="Choose where this person should appear in DiaryDock."
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={onSave}
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
              onChange={(event) => updateDraft("name", event.target.value)}
              placeholder="Name"
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#789469]"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
              Profile type
            </span>
            <select
              value={draft.kind}
              onChange={(event) =>
                updateDraft("kind", event.target.value as HouseholdProfile["kind"])
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none"
            >
              {Object.entries(profileKindLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
              Relationship
            </span>
            <input
              value={draft.relationship}
              onChange={(event) => updateDraft("relationship", event.target.value)}
              placeholder="Partner, daughter..."
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none"
            />
          </label>
        </div>

        <div>
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Profile colour
          </p>
          <div className="mt-2 flex gap-2">
            {profileColours.map((colour) => (
              <button
                key={colour}
                type="button"
                onClick={() => updateDraft("colour", colour)}
                aria-label={`Use ${colour}`}
                className={`h-9 w-9 rounded-full border-2 border-white shadow-sm ${profileColourStyles[colour].dot} ${draft.colour === colour ? "ring-2 ring-[#4d6246]" : ""}`}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Show this person in
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {surfaceOptions.map(([key, label, icon]) => (
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
          <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            App access
          </span>
          <select
            value={draft.appAccess}
            onChange={(event) =>
              updateDraft("appAccess", event.target.value as HouseholdProfile["appAccess"])
            }
            disabled={Boolean(editingProfile?.linkedUserId)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none disabled:bg-slate-50"
          >
            {Object.entries(profileAccessLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <p className="text-[10px] leading-4 text-slate-400">
            Profiles do not create accounts. Send an invitation separately if app access is needed.
          </p>
        </label>

        {message ? <p className="text-xs font-semibold text-red-600">{message}</p> : null}
        {removable ? (
          <button type="button" onClick={onDelete} className="text-xs font-semibold text-red-500">
            Remove this profile
          </button>
        ) : null}
      </div>
    </ModalShell>
  );
}

export function freshProfileDraft(colour: HouseholdProfile["colour"]): ProfileDraft {
  return { ...emptyProfileDraft, colour };
}
