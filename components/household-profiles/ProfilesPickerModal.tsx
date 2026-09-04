import {
  profileColourStyles,
  profileInitials,
  profileKindLabels
} from "@/components/household-profiles/household-profile-model";
import { ModalShell } from "@/components/ModalShell";
import { UiIcon } from "@/components/UiIcon";
import type { HouseholdProfile } from "@/lib/diarydock-data";

type ProfilesPickerModalProps = {
  canManage: boolean;
  onAdd: () => void;
  onClose: () => void;
  onSelect: (id: string) => void;
  open: boolean;
  profiles: HouseholdProfile[];
  selectedId?: string;
};

export function ProfilesPickerModal({
  canManage,
  onAdd,
  onClose,
  onSelect,
  open,
  profiles,
  selectedId
}: ProfilesPickerModalProps) {
  return (
    <ModalShell
      open={open}
      title="Everyone at home"
      subtitle="Select a person to view their DiaryDock spaces."
      onClose={onClose}
    >
      <div className="grid grid-cols-2 gap-3">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            type="button"
            onClick={() => onSelect(profile.id)}
            className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${selectedId === profile.id ? "border-[#8fa484] bg-[#edf4e9]" : "border-slate-200 bg-white"}`}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-bold ${profileColourStyles[profile.colour].avatar}`}
            >
              {profileInitials(profile.name)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-slate-800">
                {profile.name}
              </span>
              <span className="block text-[9px] text-slate-400">
                {profileKindLabels[profile.kind]}
              </span>
            </span>
          </button>
        ))}
      </div>
      {canManage ? (
        <button
          type="button"
          onClick={onAdd}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#263b35] px-4 py-3 text-xs font-semibold text-white"
        >
          <UiIcon name="plus" className="h-4 w-4" />
          Add another person
        </button>
      ) : null}
    </ModalShell>
  );
}
