import Image from "next/image";

import type { FamilyInboxItem, HouseholdStyleOption } from "@/components/family/family-workspace-model";
import { DesktopSpaceLanding } from "@/components/DesktopSpaceLanding";
import { RoomSceneHeader, roomImageLabelClass } from "@/components/RoomSceneChrome";
import type { HouseholdMember } from "@/lib/diarydock-data";

type FamilyRoomSceneProps = {
  activeStyle: HouseholdStyleOption;
  householdName?: string;
  householdStyleSet: boolean;
  hydrated: boolean;
  inboxItems: FamilyInboxItem[];
  members: HouseholdMember[];
  onOpenInbox: () => void;
  onOpenMembers: () => void;
  onOpenSchedules: () => void;
};

function RoomHotspot({
  label,
  onClick,
  position
}: {
  label: string;
  onClick: () => void;
  position: { left: string; top: string };
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`group absolute z-20 flex min-h-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center transition duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${roomImageLabelClass}`}
      style={position}
    >
      {label}
    </button>
  );
}

export function FamilyRoomScene({
  activeStyle,
  householdName,
  householdStyleSet,
  hydrated,
  inboxItems,
  members,
  onOpenInbox,
  onOpenMembers,
  onOpenSchedules
}: FamilyRoomSceneProps) {
  return (
    <>
      <DesktopSpaceLanding
        title="People"
        eyebrow={householdName ?? "Family room"}
        description="Keep household profiles, shared schedules, invitations and the family inbox together."
        image="/images/family-fireside-clean.webp"
        imageAlt="A warm fireside family room"
        items={[
          { label: "Our household", description: `${members.length} household member${members.length === 1 ? "" : "s"}`, icon: "users", href: "/family/household" },
          { label: householdStyleSet ? activeStyle.scheduleLabel : "Schedules", description: "Plans, routines and shared responsibilities", icon: "calendar", href: "/family/schedules" },
          { label: "Family inbox", description: inboxItems.length ? `${inboxItems.length} items need attention` : "Shared household items", icon: "mail", onClick: onOpenInbox },
          { label: "Invitations & access", description: "Invite people and manage access", icon: "shield", href: "/family/household" }
        ]}
      />
      <main className="fixed inset-0 overflow-hidden bg-[#bda888] lg:hidden">
        <Image src="/images/family-fireside-clean.webp" alt="" fill priority unoptimized aria-hidden="true" className="scale-110 object-cover opacity-45 blur-2xl" sizes="100vw" />
        <div className="absolute inset-0 bg-[#4b3926]/15" />
        <section
          aria-label="Interactive family room"
          className="absolute left-1/2 top-1/2 h-[max(100svh,177.71vw)] w-[max(100vw,56.27svh)] -translate-x-1/2 -translate-y-1/2 overflow-hidden bg-[#d5c3a7] shadow-[0_0_70px_rgba(38,28,19,0.35)]"
        >
          <Image src="/images/family-fireside-clean.webp" alt="A warm fireside family room with a family portrait, invitation envelope and household shelves" fill priority unoptimized className="object-cover object-center" sizes="(max-width: 544px) 100vw, 544px" />
          <div className="absolute inset-x-0 top-0 z-10 h-40 bg-gradient-to-b from-[#382b20]/45 via-[#382b20]/8 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 z-10 h-44 bg-gradient-to-t from-[#2f251c]/40 via-[#2f251c]/8 to-transparent" />
          <RoomHotspot label={hydrated && members.length ? `Family · ${members.length}` : "Family"} position={{ left: "47%", top: "26%" }} onClick={onOpenMembers} />
          <RoomHotspot label={householdStyleSet ? activeStyle.scheduleLabel : "Set up schedules"} position={{ left: "82%", top: "21%" }} onClick={onOpenSchedules} />
          <RoomHotspot label={inboxItems.length ? `Family inbox · ${inboxItems.length}` : "Family inbox"} position={{ left: "65%", top: "38%" }} onClick={onOpenInbox} />
        </section>
        <RoomSceneHeader roomName="Family Room" eyebrow={householdName ?? "DiaryDock"} />
      </main>
    </>
  );
}
