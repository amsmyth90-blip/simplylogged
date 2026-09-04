import type {
  HouseholdDirectory,
  HouseholdDirectoryInvite,
  HouseholdDirectoryMember,
  HouseholdInvitePreview,
  HouseholdOwnershipTransfer,
  HouseholdRole,
} from "./types.ts";

const roles = new Set<HouseholdRole>(["owner", "member", "viewer"]);

function record(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} is invalid.`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: string[], label: string) {
  const allowed = new Set(keys);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new Error(`${label} contains unsupported fields.`);
  }
}

function text(value: unknown, label: string, maximum: number) {
  if (typeof value !== "string") throw new Error(`${label} is invalid.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) throw new Error(`${label} is invalid.`);
  return normalized;
}

function date(value: unknown, label: string) {
  const normalized = text(value, label, 40);
  if (!Number.isFinite(Date.parse(normalized))) throw new Error(`${label} is invalid.`);
  return normalized;
}

function role(value: unknown): HouseholdRole {
  if (typeof value !== "string" || !roles.has(value as HouseholdRole)) {
    throw new Error("Household role is invalid.");
  }
  return value as HouseholdRole;
}

function member(value: unknown): HouseholdDirectoryMember {
  const item = record(value, "Household member");
  exactKeys(item, ["userId", "name", "relation", "role", "joinedAt"], "Household member");
  return {
    userId: text(item.userId, "Member ID", 128),
    name: text(item.name, "Member name", 100),
    relation: text(item.relation, "Member relationship", 100),
    role: role(item.role),
    joinedAt: date(item.joinedAt, "Member join date"),
  };
}

function invite(value: unknown): HouseholdDirectoryInvite {
  const item = record(value, "Household invitation");
  exactKeys(item, ["token", "email", "name", "relation", "access", "createdAt", "expiresAt"], "Household invitation");
  const email = text(item.email, "Invitation email", 254).toLowerCase();
  if (!email.includes("@")) throw new Error("Invitation email is invalid.");
  return {
    token: text(item.token, "Invitation token", 120),
    email,
    name: text(item.name, "Invitation name", 100),
    relation: text(item.relation, "Invitation relationship", 100),
    access: text(item.access, "Invitation access", 120),
    createdAt: date(item.createdAt, "Invitation date"),
    expiresAt: date(item.expiresAt, "Invitation expiry"),
  };
}

export function parseHouseholdInvitePreview(value: unknown): HouseholdInvitePreview {
  const item = record(value, "Household invitation preview");
  exactKeys(item, ["token", "householdName", "name", "relation", "access", "expiresAt"],
    "Household invitation preview");
  return {
    token: text(item.token, "Invitation token", 120),
    householdName: text(item.householdName, "Household name", 80),
    name: text(item.name, "Invitation name", 100),
    relation: text(item.relation, "Invitation relationship", 100),
    access: text(item.access, "Invitation access", 120),
    expiresAt: date(item.expiresAt, "Invitation expiry"),
  };
}

function ownershipTransfer(value: unknown): HouseholdOwnershipTransfer | null {
  if (value === null) return null;
  const item = record(value, "Household ownership transfer");
  exactKeys(item, ["id", "currentOwnerId", "proposedOwnerId", "createdAt", "expiresAt"],
    "Household ownership transfer");
  const transfer = {
    id: text(item.id, "Transfer ID", 128),
    currentOwnerId: text(item.currentOwnerId, "Current owner ID", 128),
    proposedOwnerId: text(item.proposedOwnerId, "Proposed owner ID", 128),
    createdAt: date(item.createdAt, "Transfer creation date"),
    expiresAt: date(item.expiresAt, "Transfer expiry"),
  };
  if (Date.parse(transfer.expiresAt) <= Date.parse(transfer.createdAt)) {
    throw new Error("Household ownership transfer is invalid.");
  }
  return transfer;
}

export function parseHouseholdDirectory(value: unknown): HouseholdDirectory {
  const item = record(value, "Household directory");
  exactKeys(item, ["householdId", "householdName", "currentUserId", "role", "members", "invites",
    "ownershipTransfer"], "Household directory");
  if (!Array.isArray(item.members) || item.members.length < 1 || item.members.length > 20) {
    throw new Error("Household members are invalid.");
  }
  if (!Array.isArray(item.invites) || item.invites.length > 20) {
    throw new Error("Household invitations are invalid.");
  }
  const directory: HouseholdDirectory = {
    householdId: text(item.householdId, "Household ID", 128),
    householdName: text(item.householdName, "Household name", 80),
    currentUserId: text(item.currentUserId, "Current user ID", 128),
    role: role(item.role),
    members: item.members.map(member),
    invites: item.invites.map(invite),
    ownershipTransfer: ownershipTransfer(item.ownershipTransfer),
  };
  if (!directory.members.some((entry) => entry.userId === directory.currentUserId && entry.role === directory.role)) {
    throw new Error("Current household membership is invalid.");
  }
  if (directory.ownershipTransfer) {
    const currentOwner = directory.members.find((entry) =>
      entry.userId === directory.ownershipTransfer?.currentOwnerId && entry.role === "owner");
    const proposedOwner = directory.members.find((entry) =>
      entry.userId === directory.ownershipTransfer?.proposedOwnerId && entry.role === "member");
    if (!currentOwner || !proposedOwner || currentOwner.userId === proposedOwner.userId) {
      throw new Error("Household ownership transfer membership is invalid.");
    }
  }
  return directory;
}
