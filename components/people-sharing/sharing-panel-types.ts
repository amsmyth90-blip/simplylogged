import type { InviteDraft } from "./people-sharing-model";
import type { sharedDocumentSummary } from "@/lib/household-access";
import type {
  HouseholdDirectoryMember,
  HouseholdRole,
} from "@/lib/household-sharing";

export type MemberSummary = ReturnType<typeof sharedDocumentSummary>;

export type PeopleSharingModalProps = {
  busy: string;
  canManage: boolean;
  createdInviteToken: string;
  currentUserId: string;
  householdName: string;
  inviteDraft: InviteDraft;
  inviteOpen: boolean;
  memberSummary: (member: HouseholdDirectoryMember) => MemberSummary;
  onCloseInvite: () => void;
  onCloseMember: () => void;
  onCloseRename: () => void;
  onCopyInvite: (token: string) => void;
  onCreateInvite: () => void;
  onHouseholdNameChange: (value: string) => void;
  onInviteChange: (draft: InviteDraft) => void;
  onRemoveMember: () => void;
  onRoleChange: (role: Exclude<HouseholdRole, "owner">) => void;
  onSaveName: () => void;
  onSaveRole: () => void;
  renameOpen: boolean;
  roleDraft: Exclude<HouseholdRole, "owner">;
  selectedMember: HouseholdDirectoryMember | null;
};
