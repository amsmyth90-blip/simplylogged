import { createInitialDiaryDockState, hydrateDiaryDockState } from "@/lib/diarydock-initial-state";
import { householdStateKeys, type DiaryDockAppState, type DiaryDockBootstrapPayload, type HouseholdMember, type HouseholdState, type Invite } from "@/lib/diarydock-types";
import { loadHouseholdDirectory, type HouseholdDirectory } from "@/lib/household-sharing";
import type { Reminder, RoomDocument, VaultDocument } from "@/lib/mock-data";
import type { DiaryDockRecordPage } from "@/lib/diarydock-record-page";
import { removeNonOwnedDocumentsFromCache } from "@/lib/resource-cache";

function mergeById<T extends { id: string }>(primary: T[], fallback: T[]) {
  const seen = new Set<string>();
  return [...primary, ...fallback].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function mergeStructuredReminders(primary: Reminder[], fallback: Reminder[]) {
  const fallbackById = new Map(fallback.map((reminder) => [reminder.id, reminder]));
  return mergeById(primary.map((reminder) => ({ ...fallbackById.get(reminder.id), ...reminder })), fallback);
}

function mergeStructuredRoomDocuments(
  state: DiaryDockAppState,
  documents: VaultDocument[],
  placement: "front" | "back" = "front",
) {
  const roomDocuments = { ...state.roomDocuments };
  documents.forEach((document) => {
    if (!document.roomId) return;
    const roomDocument: RoomDocument = {
      id: `${document.roomId}-${document.id}`,
      title: document.title,
      kind: document.kind,
      size: document.size,
      updated: document.updated
    };
    const existing = roomDocuments[document.roomId] ?? [];
    const retained = existing.filter(
      (item) => item.id !== roomDocument.id && item.title !== document.title,
    );
    roomDocuments[document.roomId] = placement === "front"
      ? [roomDocument, ...retained] : [...retained, roomDocument];
  });
  return roomDocuments;
}

export function removeNonOwnedDocumentCache(state: DiaryDockAppState, userId: string) {
  const filtered = removeNonOwnedDocumentsFromCache({ userId, documents: state.vaultDocuments, roomDocuments: state.roomDocuments });
  return hydrateDiaryDockState({ ...state, vaultDocuments: filtered.documents, roomDocuments: filtered.roomDocuments });
}

function applyStructuredData(
  state: DiaryDockAppState,
  structured: { documents: VaultDocument[]; reminders: Reminder[] },
) {
  const nextState = hydrateDiaryDockState({
    ...state,
    vaultDocuments: mergeById(structured.documents, state.vaultDocuments),
    reminders: mergeStructuredReminders(structured.reminders, state.reminders)
  });
  nextState.roomDocuments = mergeStructuredRoomDocuments(nextState, structured.documents);
  return nextState;
}

export function pickHouseholdState(state: DiaryDockAppState): HouseholdState {
  return Object.fromEntries(householdStateKeys.map((key) => [key, state[key]])) as HouseholdState;
}

export function applyHouseholdState(state: DiaryDockAppState, householdState: Partial<HouseholdState> | null | undefined) {
  if (!householdState) return state;
  return hydrateDiaryDockState({
    ...state,
    ...Object.fromEntries(householdStateKeys.filter((key) => householdState[key] !== undefined).map((key) => [key, householdState[key]]))
  });
}

function initialsForName(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "LD";
}

function inviteAge(createdAt: string) {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000));
  if (elapsedMinutes < 2) return "Just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes} minutes ago`;
  const hours = Math.floor(elapsedMinutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

export function householdMembersFromDirectory(directory: HouseholdDirectory): HouseholdMember[] {
  return directory.members.map((member) => ({
    id: member.userId,
    userId: member.userId,
    householdRole: member.role,
    joinedAt: member.joinedAt,
    name: member.name,
    role: member.relation,
    access: member.role === "owner" ? "Owner access" : member.role === "member" ? "Shared access" : "View only",
    accessTone: member.role === "owner" ? "full" : member.role === "member" ? "shared" : "limited",
    note: member.role === "owner" ? "Owns household access, invitations and shared DiaryDock settings." : member.role === "member" ? "Can update shared household plans, reminders and Kitchen spaces." : "Can only view explicitly available household information.",
    initials: initialsForName(member.name),
    manages: member.role === "owner" ? ["Everything"] : member.role === "member" ? ["Kitchen", "Calendar", "Reminders"] : [],
    lastActive: member.userId === directory.currentUserId ? "Now" : "Recently"
  }));
}

export function familyInvitesFromDirectory(directory: HouseholdDirectory): Invite[] {
  return directory.invites.map((invite) => ({
    id: invite.token,
    email: invite.email,
    expiresAt: invite.expiresAt,
    name: invite.name,
    relation: invite.relation,
    access: invite.access,
    sentAgo: inviteAge(invite.createdAt),
    initials: initialsForName(invite.name),
    status: "pending"
  }));
}

export function applyHouseholdDirectory(state: DiaryDockAppState, directory: Awaited<ReturnType<typeof loadHouseholdDirectory>>) {
  if (!directory) return state;
  return hydrateDiaryDockState({ ...state, householdMembers: householdMembersFromDirectory(directory), familyInvites: familyInvitesFromDirectory(directory) });
}

export function hydrateDiaryDockBootstrap(payload: DiaryDockBootstrapPayload): DiaryDockAppState {
  let state = payload.privateState ? hydrateDiaryDockState(payload.privateState) : createInitialDiaryDockState();
  state = removeNonOwnedDocumentCache(state, payload.userId);
  state = applyHouseholdState(state, payload.householdState);
  state = applyHouseholdDirectory(state, payload.household);
  return applyStructuredData(state, {
    documents: payload.documents,
    reminders: payload.reminders,
  });
}

export function mergeDiaryDockRecordPage(
  state: DiaryDockAppState,
  page: DiaryDockRecordPage,
) {
  const next = hydrateDiaryDockState({
    ...state,
    vaultDocuments: mergeById(state.vaultDocuments, page.documents),
    reminders: mergeStructuredReminders(state.reminders, page.reminders),
  });
  next.roomDocuments = mergeStructuredRoomDocuments(next, page.documents, "back");
  return next;
}
