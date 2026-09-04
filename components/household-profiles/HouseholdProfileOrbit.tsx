import Link from "next/link";

import {
  profileAccessLabels,
  profileColourStyles,
  profileInitials,
  profileKindLabels
} from "@/components/household-profiles/household-profile-model";
import type { ProfileDestination } from "@/components/household-profiles/profile-destinations";
import { UiIcon } from "@/components/UiIcon";
import type { HouseholdProfile } from "@/lib/diarydock-data";

type HouseholdProfileOrbitProps = {
  canManage: boolean;
  destinations: ProfileDestination[];
  householdName: string;
  hydrated: boolean;
  onAdd: () => void;
  onEdit: () => void;
  onOpenAll: () => void;
  onSelect: (id: string) => void;
  profiles: HouseholdProfile[];
  selectedProfile: HouseholdProfile | null;
};

const orbitPositions = [
  { left: "22%", top: "18%" },
  { left: "78%", top: "18%" },
  { left: "22%", top: "69%" },
  { left: "78%", top: "69%" }
];

export function HouseholdProfileOrbit({
  canManage,
  destinations,
  householdName,
  hydrated,
  onAdd,
  onEdit,
  onOpenAll,
  onSelect,
  profiles,
  selectedProfile
}: HouseholdProfileOrbitProps) {
  return (
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
          <span className="max-w-[74px] truncate text-[7px] text-slate-400">{householdName}</span>
        </Link>

        {profiles.slice(0, 4).map((profile, index) => (
          <button
            key={profile.id}
            type="button"
            onClick={() => onSelect(profile.id)}
            aria-label={`Select ${profile.name}`}
            aria-pressed={selectedProfile?.id === profile.id}
            className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={orbitPositions[index]}
          >
            <span
              className={`flex h-[66px] w-[66px] items-center justify-center rounded-full border-[5px] border-white text-base font-bold shadow-[0_16px_34px_-20px_rgba(35,53,42,0.72)] transition ${profileColourStyles[profile.colour].avatar} ${selectedProfile?.id === profile.id ? "ring-2 ring-[#718967] ring-offset-2" : ""}`}
            >
              {profileInitials(profile.name)}
            </span>
            <span className="mt-1 max-w-[88px] truncate text-[10px] font-bold text-slate-700">
              {profile.name.split(" ")[0]}
            </span>
            <span className="text-[8px] text-slate-400">{profileKindLabels[profile.kind]}</span>
          </button>
        ))}

        {profiles.length > 4 ? (
          <button
            type="button"
            onClick={onOpenAll}
            className="absolute bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/90 bg-white/85 px-3 py-1 text-[9px] font-bold text-[#617657] shadow-sm"
          >
            +{profiles.length - 4} more profiles
          </button>
        ) : null}
      </div>

      {selectedProfile ? (
        <div className="absolute inset-x-3 bottom-3 h-[156px] rounded-[24px] border border-white/95 bg-white/88 p-3 shadow-[0_18px_38px_-27px_rgba(34,51,40,0.58)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-bold ${profileColourStyles[selectedProfile.colour].avatar}`}
            >
              {profileInitials(selectedProfile.name)}
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
                {profileKindLabels[selectedProfile.kind]}
                {selectedProfile.relationship ? ` · ${selectedProfile.relationship}` : ""}
                {` · ${profileAccessLabels[selectedProfile.appAccess]}`}
              </p>
            </div>
            {canManage ? (
              <button
                type="button"
                onClick={onEdit}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-bold text-[#5d7553]"
              >
                Edit
              </button>
            ) : null}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {destinations.map((destination) =>
              destination.enabled ? (
                <Link
                  key={destination.label}
                  href={destination.href}
                  className="rounded-2xl border border-[#d8e4d3] bg-[#edf4e9] px-2 py-2 text-center text-[#5d7653] transition active:scale-95"
                >
                  <UiIcon name={destination.icon} className="mx-auto h-4 w-4" />
                  <span className="mt-1 block text-[8px] font-bold">{destination.label}</span>
                </Link>
              ) : (
                <button
                  key={destination.label}
                  type="button"
                  onClick={onEdit}
                  className="rounded-2xl border border-slate-100 bg-slate-50 px-2 py-2 text-center text-slate-300"
                  aria-label={`Enable ${destination.label} for ${selectedProfile.name}`}
                >
                  <UiIcon name={destination.icon} className="mx-auto h-4 w-4" />
                  <span className="mt-1 block text-[8px] font-bold">{destination.label}</span>
                </button>
              )
            )}
          </div>
        </div>
      ) : hydrated ? (
        <div className="absolute inset-x-5 bottom-8 rounded-[24px] border border-dashed border-[#b8c8af] bg-white/80 px-5 py-6 text-center">
          <p className="text-sm font-semibold text-slate-700">Start your household</p>
          <button
            type="button"
            onClick={onAdd}
            className="mt-2 rounded-full bg-[#718a65] px-4 py-2 text-[10px] font-bold text-white"
          >
            Add the first profile
          </button>
        </div>
      ) : null}
    </section>
  );
}
