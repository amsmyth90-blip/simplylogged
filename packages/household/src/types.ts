export const HOUSEHOLD_DIRECTORY_SCHEMA_VERSION = 2;

export type HouseholdInvitePreview = {
  token: string;
  householdName: string;
  name: string;
  relation: string;
  access: string;
  expiresAt: string;
};

export type HouseholdRole = "owner" | "member" | "viewer";

export type HouseholdDirectoryMember = {
  userId: string;
  name: string;
  relation: string;
  role: HouseholdRole;
  joinedAt: string;
};

export type HouseholdDirectoryInvite = {
  token: string;
  email: string;
  name: string;
  relation: string;
  access: string;
  createdAt: string;
  expiresAt: string;
};

export type HouseholdOwnershipTransfer = {
  id: string;
  currentOwnerId: string;
  proposedOwnerId: string;
  createdAt: string;
  expiresAt: string;
};

export type HouseholdDirectory = {
  householdId: string;
  householdName: string;
  currentUserId: string;
  role: HouseholdRole;
  members: HouseholdDirectoryMember[];
  invites: HouseholdDirectoryInvite[];
  ownershipTransfer: HouseholdOwnershipTransfer | null;
};

export type HouseholdAccessEvent = {
  id: string;
  actorUserId: string;
  eventType: string;
  createdAt: string;
  metadata: Record<string, unknown>;
};

export const HOUSEHOLD_PEOPLE_SCHEMA_VERSION = 1;

export type HouseholdPersonType =
  | "owner"
  | "adult"
  | "teen"
  | "child"
  | "dependent"
  | "trusted_contact";

export type HouseholdPerson = {
  id: string;
  householdId: string;
  linkedUserId: string | null;
  firstName: string;
  lastName: string;
  preferredName: string;
  relationship: string;
  personType: HouseholdPersonType;
  dateOfBirth: string | null;
  avatarStoragePath: string | null;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type HouseholdPeopleDirectory = {
  householdId: string;
  currentUserRole: HouseholdRole;
  people: HouseholdPerson[];
};
