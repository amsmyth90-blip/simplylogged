import Link from "next/link";

import { ModalShell } from "@/components/ModalShell";
import { UiIcon } from "@/components/UiIcon";
import type { HouseholdMember } from "@/lib/diarydock-data";

type FamilyMemberModalProps = {
  canManage: boolean;
  inviteCount: number;
  members: HouseholdMember[];
  onClose: () => void;
  onSelect: (member: HouseholdMember) => void;
  selected: HouseholdMember | null;
};

export function FamilyMemberModal({
  canManage,
  inviteCount,
  members,
  onClose,
  onSelect,
  selected
}: FamilyMemberModalProps) {
  return (
    <ModalShell
      open={Boolean(selected)}
      title="Our family"
      subtitle={`${members.length} household member${members.length === 1 ? "" : "s"}`}
      onClose={onClose}
      footer={
        <div className="grid gap-2 sm:grid-cols-2">
          <Link href="/family/household" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#24372f] px-4 py-3 text-sm font-semibold text-white shadow-sm">
            <UiIcon name="users" className="h-4 w-4" />
            People & sharing
          </Link>
          <Link href="/family/household" className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#718068]/20 bg-[#e7ede1] px-4 py-3 text-sm font-semibold text-[#4e6048]">
            <UiIcon name="mail" className="h-4 w-4" />
            {canManage ? "Invite someone" : "View invitations"}
            {inviteCount ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#aa5548] px-1.5 text-[10px] font-bold text-white">{inviteCount}</span>
            ) : null}
          </Link>
        </div>
      }
    >
      {selected ? (
        <div className="space-y-4">
          {members.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => onSelect(member)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${member.id === selected.id ? "border-[#76886a] bg-[#dfe8d6] text-[#43533d]" : "border-black/10 bg-white/70 text-ink/55"}`}
                >
                  {member.name}
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex items-center gap-4 rounded-3xl border border-white/80 bg-white/70 p-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#dfe8d6] text-lg font-semibold text-[#52664a]">{selected.initials}</span>
            <div>
              <p className="font-semibold text-ink">{selected.name}</p>
              <p className="mt-0.5 text-sm text-ink/55">{selected.role} · {selected.access}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/65 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40">Relationship</p>
              <p className="mt-1 text-sm font-semibold text-ink">{selected.role || "Family member"}</p>
            </div>
            <div className="rounded-2xl bg-white/65 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40">Last active</p>
              <p className="mt-1 text-sm font-semibold text-ink">{selected.lastActive}</p>
            </div>
          </div>
          <p className="text-sm leading-6 text-ink/60">{selected.note}</p>
        </div>
      ) : null}
    </ModalShell>
  );
}
