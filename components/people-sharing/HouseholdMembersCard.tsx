import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";
import { memberInitials } from "./people-sharing-model";
import { householdRoleLabel } from "@/lib/household-access";
import type { HouseholdDirectoryMember } from "@/lib/household-sharing";

import type { MemberSummary } from "./sharing-panel-types";

export function HouseholdMembersCard({
  canManage,
  currentUserId,
  householdName,
  memberSummary,
  members,
  onOpenMember,
  onRename,
}: {
  canManage: boolean;
  currentUserId: string;
  householdName: string;
  memberSummary: (member: HouseholdDirectoryMember) => MemberSummary;
  members: HouseholdDirectoryMember[];
  onOpenMember: (member: HouseholdDirectoryMember) => void;
  onRename: () => void;
}) {
  return (
    <section className="estate-sheet p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            {householdName}
          </h2>
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={onRename}
            className="rounded-full border border-black/10 bg-white/80 px-3 py-2 text-xs font-semibold text-ink/65"
          >
            Rename
          </button>
        ) : null}
      </div>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {members.map((member) => {
          const summary = memberSummary(member);
          const isCurrent = member.userId === currentUserId;
          return (
            <button
              key={member.userId}
              type="button"
              onClick={() => onOpenMember(member)}
              className="flex min-h-24 items-center gap-3 rounded-[22px] border border-white/80 bg-white/72 p-3.5 text-left shadow-sm transition hover:bg-white"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sage/65 text-sm font-bold text-moss">
                {memberInitials(member.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-ink">
                    {member.name}
                  </span>
                  {isCurrent ? (
                    <span className="rounded-full bg-mist px-2 py-0.5 text-[9px] font-bold text-ink/55">
                      You
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-xs text-ink/48">
                  {householdRoleLabel(member.role)} · {member.relation}
                </span>
                <span className="mt-1.5 block text-[11px] font-semibold text-moss">
                  {isCurrent
                    ? "Your DiaryDock account"
                    : `${summary.totalCount} of your documents visible`}
                </span>
              </span>
              <UiIcon
                name="chevron-right"
                className="h-4 w-4 shrink-0 text-ink/30"
              />
            </button>
          );
        })}
      </div>
      <div className="mt-4 grid gap-2 border-t border-black/5 pt-4 sm:grid-cols-3">
        {canManage ? (
          <Link
            href="/family/new-member"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-ink px-4 text-sm font-semibold text-white"
          >
            <UiIcon name="plus" className="h-4 w-4" /> Add someone
          </Link>
        ) : null}
        <Link
          href="/family/household/profiles"
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white/75 px-4 text-sm font-semibold text-ink/65"
        >
          <UiIcon name="users" className="h-4 w-4" /> Profiles
        </Link>
        <Link
          href="/files?filter=shared"
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-ink px-4 text-sm font-semibold text-white"
        >
          <UiIcon name="folder" className="h-4 w-4" /> Shared files
        </Link>
      </div>
    </section>
  );
}
