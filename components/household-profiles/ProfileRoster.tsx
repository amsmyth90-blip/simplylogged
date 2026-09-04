import type { HouseholdProfile } from "@/lib/diarydock-data";

import {
  profileColourStyles,
  profileInitials
} from "@/components/household-profiles/household-profile-model";
import { UiIcon } from "@/components/UiIcon";

type ProfileRosterProps = {
  canManage: boolean;
  hydrated: boolean;
  onAdd: () => void;
  onOpenAll: () => void;
  onSelect: (id: string) => void;
  profiles: HouseholdProfile[];
  selectedId?: string;
};

export function ProfileRoster({
  canManage,
  hydrated,
  onAdd,
  onOpenAll,
  onSelect,
  profiles,
  selectedId
}: ProfileRosterProps) {
  return (
    <div className="grid h-[88px] shrink-0 grid-cols-4 gap-2">
      {profiles.slice(0, 3).map((profile) => {
        const selected = selectedId === profile.id;
        return (
          <button
            key={profile.id}
            type="button"
            onClick={() => onSelect(profile.id)}
            aria-label={`Select ${profile.name}`}
            aria-pressed={selected}
            className={`flex min-w-0 flex-col items-center justify-center rounded-[20px] border px-1 transition active:scale-95 ${selected ? "border-[#8ea682] bg-[#edf4e9] shadow-sm" : "border-white/90 bg-white/70"}`}
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-[15px] text-[11px] font-bold shadow-sm ${profileColourStyles[profile.colour].avatar}`}
            >
              {profileInitials(profile.name)}
            </span>
            <span className="mt-1 max-w-full truncate text-[9px] font-bold text-slate-700">
              {profile.name.split(" ")[0]}
            </span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={profiles.length > 3 ? onOpenAll : onAdd}
        disabled={!hydrated || !canManage}
        className="flex min-w-0 flex-col items-center justify-center rounded-[20px] border border-dashed border-[#b8c7b1] bg-white/45 px-1 text-[#617657] transition active:scale-95 disabled:opacity-40"
        aria-label={profiles.length > 3 ? "Show all household profiles" : "Add household profile"}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-[15px] bg-white/75 text-sm font-semibold shadow-sm">
          {profiles.length > 3 ? (
            `+${profiles.length - 3}`
          ) : (
            <UiIcon name="plus" className="h-4 w-4" />
          )}
        </span>
        <span className="mt-1 text-[9px] font-bold">{profiles.length > 3 ? "More" : "Add"}</span>
      </button>
    </div>
  );
}
