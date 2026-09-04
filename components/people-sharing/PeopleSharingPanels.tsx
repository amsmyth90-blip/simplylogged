import {
  InviteHouseholdModal,
  RenameHouseholdModal,
} from "./HouseholdSettingsModals";
import { MemberAccessModal } from "./MemberAccessModal";
import type { PeopleSharingModalProps } from "./sharing-panel-types";

export { HouseholdAccessActivity } from "./HouseholdAccessActivity";
export { HouseholdMembersCard } from "./HouseholdMembersCard";
export { HouseholdOwnershipTransfer } from "./HouseholdOwnershipTransfer";

export function PeopleSharingModals(props: PeopleSharingModalProps) {
  return (
    <>
      <MemberAccessModal
        busy={props.busy}
        canManage={props.canManage}
        currentUserId={props.currentUserId}
        memberSummary={props.memberSummary}
        onCloseMember={props.onCloseMember}
        onRemoveMember={props.onRemoveMember}
        onRoleChange={props.onRoleChange}
        onSaveRole={props.onSaveRole}
        roleDraft={props.roleDraft}
        selectedMember={props.selectedMember}
      />
      <InviteHouseholdModal
        busy={props.busy}
        createdInviteToken={props.createdInviteToken}
        inviteDraft={props.inviteDraft}
        inviteOpen={props.inviteOpen}
        onCloseInvite={props.onCloseInvite}
        onCopyInvite={props.onCopyInvite}
        onCreateInvite={props.onCreateInvite}
        onInviteChange={props.onInviteChange}
      />
      <RenameHouseholdModal
        busy={props.busy}
        householdName={props.householdName}
        onCloseRename={props.onCloseRename}
        onHouseholdNameChange={props.onHouseholdNameChange}
        onSaveName={props.onSaveName}
        renameOpen={props.renameOpen}
      />
    </>
  );
}
