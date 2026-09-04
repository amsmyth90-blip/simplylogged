import { ModalShell } from "@/components/ModalShell";
import {
  householdRoleDescription,
  householdRoleLabel,
} from "@/lib/household-access";

import { MemberCounts, RoleChoices } from "./SharingFormControls";
import type { PeopleSharingModalProps } from "./sharing-panel-types";

type MemberModalProps = Pick<
  PeopleSharingModalProps,
  | "busy"
  | "canManage"
  | "currentUserId"
  | "memberSummary"
  | "onCloseMember"
  | "onRemoveMember"
  | "onRoleChange"
  | "onSaveRole"
  | "roleDraft"
  | "selectedMember"
>;

export function MemberAccessModal(props: MemberModalProps) {
  const member = props.selectedMember;
  return (
    <ModalShell
      open={Boolean(member)}
      title={member?.name ?? "Household member"}
      subtitle={
        member
          ? `${householdRoleLabel(member.role)} · ${member.relation}`
          : undefined
      }
      onClose={props.onCloseMember}
    >
      {member ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-sage/45 p-4">
            <p className="text-sm font-semibold text-ink">What can they see?</p>
            {member.userId === props.currentUserId ? (
              <p className="mt-2 text-sm leading-6 text-ink/58">
                Your own records remain available to you. Household membership
                never makes another person&apos;s private records visible.
              </p>
            ) : (
              <MemberCounts summary={props.memberSummary(member)} />
            )}
            <p className="mt-3 text-xs leading-5 text-ink/48">
              These counts cover documents you own. Private documents and other
              people&apos;s choices are not revealed.
            </p>
          </div>
          <div className="rounded-2xl border border-black/8 bg-white/72 p-4">
            <p className="text-sm font-semibold text-ink">
              {householdRoleLabel(member.role)}
            </p>
            <p className="mt-1 text-xs leading-5 text-ink/52">
              {householdRoleDescription(member.role)}
            </p>
          </div>
          {props.canManage && member.role !== "owner" ? (
            <div className="space-y-3">
              <RoleChoices
                value={props.roleDraft}
                onChange={props.onRoleChange}
              />
              <button
                type="button"
                disabled={Boolean(props.busy)}
                onClick={props.onSaveRole}
                className="min-h-11 w-full rounded-2xl bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                {props.busy === "role" ? "Saving…" : "Save role"}
              </button>
              <button
                type="button"
                disabled={Boolean(props.busy)}
                onClick={props.onRemoveMember}
                className="min-h-11 w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 disabled:opacity-50"
              >
                {props.busy === "remove"
                  ? "Removing…"
                  : "Remove from household"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </ModalShell>
  );
}
