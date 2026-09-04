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

type SelectedProfileCardProps = {
  canManage: boolean;
  destinations: ProfileDestination[];
  onEdit: () => void;
  profile: HouseholdProfile;
};

function DestinationCard({
  destination,
  onEnable,
  profileName
}: {
  destination: ProfileDestination;
  onEnable: () => void;
  profileName: string;
}) {
  const content = (
    <>
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] ${destination.enabled ? destination.tone : "bg-slate-100"}`}
      >
        <UiIcon name={destination.icon} className="h-4 w-4" />
      </span>
      <span className="ml-3 min-w-0 flex-1">
        <span className="block text-[12px] font-semibold">{destination.label}</span>
        <span className="mt-0.5 block truncate text-[9px]">
          {destination.enabled ? destination.detail : "Tap to enable"}
        </span>
      </span>
      <UiIcon name="chevron-right" className="h-4 w-4 text-slate-400" />
    </>
  );

  if (destination.enabled) {
    return (
      <Link
        href={destination.href}
        className="flex min-h-0 items-center rounded-[18px] border border-white/95 bg-white/82 px-3 text-slate-800 shadow-sm transition active:scale-[0.98]"
      >
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onEnable}
      className="flex min-h-0 items-center rounded-[18px] border border-slate-100 bg-slate-50/80 px-3 text-left text-slate-300"
      aria-label={`Enable ${destination.label} for ${profileName}`}
    >
      {content}
    </button>
  );
}

export function SelectedProfileCard({
  canManage,
  destinations,
  onEdit,
  profile
}: SelectedProfileCardProps) {
  return (
    <div className="mt-3 flex min-h-0 flex-1 flex-col rounded-[26px] border border-white/95 bg-[linear-gradient(155deg,rgba(255,255,255,0.95),rgba(244,247,240,0.86))] p-4 shadow-[0_18px_42px_-30px_rgba(34,51,40,0.55)]">
      <div className="flex shrink-0 items-center gap-4">
        <span
          className={`flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[24px] text-xl font-bold shadow-[0_14px_28px_-20px_rgba(42,61,47,0.7)] ${profileColourStyles[profile.colour].avatar}`}
        >
          {profileInitials(profile.name)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-semibold tracking-tight">{profile.name}</h2>
          <div className="mt-1 flex min-w-0 items-center gap-2">
            <p className="min-w-0 truncate text-[11px] text-slate-500">
              {profileKindLabels[profile.kind]}
              {profile.relationship ? ` - ${profile.relationship}` : ""}
            </p>
            {profile.linkedUserId ? (
              <span className="shrink-0 rounded-full bg-[#e5eee0] px-2 py-1 text-[7px] font-bold uppercase text-[#5c7352]">
                Account
              </span>
            ) : null}
          </div>
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-[#5d7553] shadow-sm"
          >
            Edit
          </button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => canManage && onEdit()}
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
            {profileAccessLabels[profile.appAccess]}
          </span>
        </span>
        {canManage ? <UiIcon name="chevron-right" className="h-4 w-4 text-slate-400" /> : null}
      </button>

      <div className="mt-3 grid min-h-0 flex-1 grid-rows-3 gap-2">
        {destinations.map((destination) => (
          <DestinationCard
            key={destination.label}
            destination={destination}
            onEnable={onEdit}
            profileName={profile.name}
          />
        ))}
      </div>
    </div>
  );
}
