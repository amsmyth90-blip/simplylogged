"use client";

import type { Dispatch, SetStateAction } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import {
  buildDraft,
  buildRoomDocument,
  defaultDraft,
  type FilingDestination,
  type VaultDraft,
} from "@/components/vault-workspace/vault-workspace-model";
import { setDocumentSharing } from "@/lib/document-sharing";
import type { RoomDocument, VaultDocument } from "@/lib/mock-data";
import { deleteStructuredDocument, upsertStructuredDocument } from "@/lib/structured-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Inputs = {
  draft: VaultDraft;
  setDraft: Dispatch<SetStateAction<VaultDraft>>;
  editingId: string | null;
  setEditingId: Dispatch<SetStateAction<string | null>>;
  setOpen: Dispatch<SetStateAction<boolean>>;
  setSelectedId: Dispatch<SetStateAction<string>>;
  setFileMessage: Dispatch<SetStateAction<string | null>>;
  setOpeningFileId: Dispatch<SetStateAction<string | null>>;
  setBusyDocumentId: Dispatch<SetStateAction<string | null>>;
  setManualDestinationValues: Dispatch<SetStateAction<Record<string, string>>>;
  selectedDocument: VaultDocument | null;
};

export function useVaultDocumentActions(inputs: Inputs) {
  const { state, repositoryMode, updateState } = useDiaryDockData();
  const documents = state.vaultDocuments;
  const shareOptions = state.householdMembers.filter((member) =>
    Boolean(member.userId) && member.lastActive !== "Now",
  );
  const openCreate = () => {
    inputs.setEditingId(null);
    inputs.setDraft(defaultDraft);
    inputs.setOpen(true);
  };
  const openEdit = (document: VaultDocument) => {
    if (document.isOwnedByCurrentUser === false) {
      inputs.setFileMessage("You can view this shared document, but only its owner can change it.");
      return;
    }
    inputs.setEditingId(document.id);
    const nextDraft = buildDraft(document);
    if (!nextDraft.sharedWithUserIds.length && document.sharedWith?.length) {
      nextDraft.sharedWithUserIds = shareOptions
        .filter((member) => document.sharedWith?.includes(member.name))
        .map((member) => member.userId)
        .filter((userId): userId is string => Boolean(userId));
    }
    inputs.setDraft(nextDraft);
    inputs.setOpen(true);
  };
  const closeModal = () => {
    inputs.setOpen(false);
    inputs.setEditingId(null);
    inputs.setDraft(defaultDraft);
  };
  const saveDocument = async () => {
    const title = inputs.draft.title.trim();
    if (!title) return;
    const existing = inputs.editingId
      ? documents.find((document) => document.id === inputs.editingId)
      : null;
    const selectedUserIds = inputs.draft.visibility === "SELECTED_MEMBERS"
      ? inputs.draft.sharedWithUserIds
      : [];
    const sharedWith = shareOptions
      .filter((member) => member.userId && selectedUserIds.includes(member.userId))
      .map((member) => member.name);
    const nextDocument: VaultDocument = {
      ...existing,
      id: inputs.editingId ?? crypto.randomUUID(),
      title,
      category: inputs.draft.category,
      kind: inputs.draft.kind,
      size: inputs.draft.size.trim() || "Pending upload",
      updated: "Just now",
      sharedWith,
      visibility: inputs.draft.visibility,
      sharedWithUserIds: selectedUserIds,
      emergencyVisible: inputs.draft.emergencyVisible,
      starred: inputs.draft.starred,
    };
    if (repositoryMode === "supabase") {
      try {
        await upsertStructuredDocument(nextDocument);
        await setDocumentSharing({
          documentId: nextDocument.id,
          visibility: inputs.draft.visibility,
          selectedUserIds,
        });
      } catch (error) {
        inputs.setFileMessage(error instanceof Error ? error.message : "The document sharing choice could not be saved.");
        return;
      }
    }
    updateState((current) => ({
      ...current,
      vaultDocuments: inputs.editingId
        ? current.vaultDocuments.map((document) => document.id === inputs.editingId ? nextDocument : document)
        : [nextDocument, ...current.vaultDocuments],
    }));
    inputs.setSelectedId(nextDocument.id);
    closeModal();
  };
  const openStoredFile = async (document: VaultDocument) => {
    if (!document.storageBucket || !document.storagePath) return;
    const client = getSupabaseBrowserClient();
    if (!client) {
      inputs.setFileMessage("Supabase storage is not available in this session.");
      return;
    }
    inputs.setOpeningFileId(document.id);
    inputs.setFileMessage(null);
    const { data, error } = await client.storage.from(document.storageBucket)
      .createSignedUrl(document.storagePath, 60);
    inputs.setOpeningFileId(null);
    if (error || !data?.signedUrl) {
      inputs.setFileMessage(error?.message ?? "DiaryDock could not open the stored file yet.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  const updateDocument = (nextDocument: VaultDocument) => {
    if (nextDocument.isOwnedByCurrentUser === false) {
      inputs.setFileMessage("Only the document owner can change this shared record.");
      return;
    }
    updateState((current) => ({
      ...current,
      vaultDocuments: current.vaultDocuments.map((document) =>
        document.id === nextDocument.id ? nextDocument : document),
    }));
    void upsertStructuredDocument(nextDocument);
  };
  const toggleSelectedFlag = (flag: "starred" | "emergencyVisible") => {
    if (!inputs.selectedDocument) return;
    updateDocument({
      ...inputs.selectedDocument,
      [flag]: !inputs.selectedDocument[flag],
      updated: "Just now",
    });
  };
  const markSelectedReviewed = () => {
    if (!inputs.selectedDocument) return;
    updateDocument({
      ...inputs.selectedDocument,
      reviewStatus: "reviewed",
      reviewReasons: [],
      reviewedAt: "Just now",
      updated: "Just now",
    });
  };
  const fileDocumentToDestination = async (
    document: VaultDocument,
    destination: FilingDestination,
  ) => {
    if (document.isOwnedByCurrentUser === false) {
      inputs.setFileMessage("Only the document owner can file or review this shared record.");
      return;
    }
    const filedDocument: VaultDocument = {
      ...document,
      category: destination.category,
      roomId: destination.roomId,
      roomName: destination.roomName,
      reviewStatus: "reviewed",
      reviewReasons: [],
      reviewedAt: "Just now",
      updated: "Just now",
    };
    const nextRoomDocument = buildRoomDocument(filedDocument, destination);
    inputs.setBusyDocumentId(document.id);
    inputs.setFileMessage(null);
    updateState((current) => ({
      ...current,
      vaultDocuments: current.vaultDocuments.map((item) => item.id === document.id ? filedDocument : item),
      roomDocuments: moveRoomDocument(current.roomDocuments, document, destination.roomId, nextRoomDocument),
      mailboxItems: current.mailboxItems.filter((item) => item.title !== document.title),
    }));
    await upsertStructuredDocument(filedDocument).then(() => {
      inputs.setFileMessage(`Filed in ${destination.roomName} · ${destination.category}.`);
      inputs.setManualDestinationValues((current) => {
        const next = { ...current };
        delete next[document.id];
        return next;
      });
    }).catch((error: unknown) => {
      inputs.setFileMessage(error instanceof Error ? error.message : "DiaryDock could not file this document yet.");
    });
    inputs.setBusyDocumentId(null);
  };
  const deleteDuplicateDocument = async (document: VaultDocument) => {
    if (document.isOwnedByCurrentUser === false) {
      inputs.setFileMessage("Only the document owner can delete this shared record.");
      return;
    }
    if (!window.confirm(`Delete duplicate "${document.title}" from DiaryDock?`)) return;
    inputs.setBusyDocumentId(document.id);
    inputs.setFileMessage(null);
    updateState((current) => ({
      ...current,
      vaultDocuments: current.vaultDocuments.filter((item) => item.id !== document.id),
      roomDocuments: Object.fromEntries(Object.entries(current.roomDocuments).map(([roomId, roomDocuments]) => [
        roomId,
        roomDocuments.filter((item) => item.id !== `${roomId}-${document.id}` && item.title !== document.title),
      ])),
      reminders: current.reminders.filter((reminder) => reminder.documentId !== document.id),
      mailboxItems: current.mailboxItems.filter((item) => item.title !== document.title),
    }));
    await deleteStructuredDocument(document).catch((error: unknown) => {
      inputs.setFileMessage(error instanceof Error ? error.message : "DiaryDock could not delete this duplicate.");
    });
    inputs.setBusyDocumentId(null);
  };

  return {
    openCreate, openEdit, closeModal, saveDocument, openStoredFile,
    toggleSelectedFlag, markSelectedReviewed, fileDocumentToDestination,
    deleteDuplicateDocument,
  };
}

function moveRoomDocument(
  current: Record<string, RoomDocument[]>,
  document: VaultDocument,
  roomId: string,
  nextDocument: RoomDocument,
) {
  const result = Object.fromEntries(Object.entries(current).map(([key, roomDocuments]) => [
    key,
    roomDocuments.filter((item) => item.id !== `${key}-${document.id}` && item.title !== document.title),
  ])) as Record<string, RoomDocument[]>;
  const existing = result[roomId] ?? [];
  result[roomId] = [nextDocument, ...existing.filter((item) =>
    item.id !== nextDocument.id && item.title !== nextDocument.title,
  )].slice(0, 8);
  return result;
}
