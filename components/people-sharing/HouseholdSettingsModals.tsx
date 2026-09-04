import { ModalShell } from "@/components/ModalShell";

import { DraftInput, RoleChoices } from "./SharingFormControls";
import type { PeopleSharingModalProps } from "./sharing-panel-types";

type InviteModalProps = Pick<
  PeopleSharingModalProps,
  | "busy"
  | "createdInviteToken"
  | "inviteDraft"
  | "inviteOpen"
  | "onCloseInvite"
  | "onCopyInvite"
  | "onCreateInvite"
  | "onInviteChange"
>;

export function InviteHouseholdModal(props: InviteModalProps) {
  return (
    <ModalShell
      open={props.inviteOpen}
      title="Invite someone"
      subtitle="Create an email-bound link. It is not sent automatically."
      onClose={props.onCloseInvite}
      footer={
        <button
          type="button"
          disabled={Boolean(props.busy) || Boolean(props.createdInviteToken)}
          onClick={props.onCreateInvite}
          className="min-h-11 w-full rounded-2xl bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {props.busy === "invite"
            ? "Creating…"
            : props.createdInviteToken
              ? "Invitation created"
              : "Create invitation link"}
        </button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <DraftInput
            label="Name"
            value={props.inviteDraft.name}
            onChange={(name) =>
              props.onInviteChange({ ...props.inviteDraft, name })
            }
          />
          <DraftInput
            label="Relationship"
            value={props.inviteDraft.relation}
            onChange={(relation) =>
              props.onInviteChange({ ...props.inviteDraft, relation })
            }
          />
        </div>
        <DraftInput
          email
          label="Email address"
          value={props.inviteDraft.email}
          onChange={(email) =>
            props.onInviteChange({ ...props.inviteDraft, email })
          }
        />
        <RoleChoices
          invite
          value={props.inviteDraft.role}
          onChange={(role) =>
            props.onInviteChange({ ...props.inviteDraft, role })
          }
        />
        {props.createdInviteToken ? (
          <button
            type="button"
            onClick={() => props.onCopyInvite(props.createdInviteToken)}
            className="min-h-11 w-full rounded-2xl bg-sage/65 px-4 text-sm font-semibold text-moss"
          >
            Copy secure invitation link
          </button>
        ) : null}
      </div>
    </ModalShell>
  );
}

type RenameModalProps = Pick<
  PeopleSharingModalProps,
  | "busy"
  | "householdName"
  | "onCloseRename"
  | "onHouseholdNameChange"
  | "onSaveName"
  | "renameOpen"
>;

export function RenameHouseholdModal(props: RenameModalProps) {
  return (
    <ModalShell
      open={props.renameOpen}
      title="Household name"
      subtitle="This is shown to active household members."
      onClose={props.onCloseRename}
      footer={
        <button
          type="button"
          disabled={Boolean(props.busy) || !props.householdName.trim()}
          onClick={props.onSaveName}
          className="min-h-11 w-full rounded-2xl bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {props.busy === "rename" ? "Saving…" : "Save name"}
        </button>
      }
    >
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-ink/60">Name</span>
        <input
          maxLength={80}
          value={props.householdName}
          onChange={(event) => props.onHouseholdNameChange(event.target.value)}
          className="w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm outline-none"
        />
      </label>
    </ModalShell>
  );
}
