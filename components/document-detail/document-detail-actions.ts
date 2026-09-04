import type { DocumentCorrectionDraft } from "@/components/document-detail/document-detail-model";
import { setDocumentSharing } from "@/lib/document-sharing";
import type { DiaryDockAppState, HouseholdMember, RepositoryMode } from "@/lib/diarydock-data";
import { roomDetails, type Reminder, type VaultDocument } from "@/lib/mock-data";
import { upsertStructuredDocument, upsertStructuredReminder } from "@/lib/structured-data";

type UpdateState = (updater: (current: DiaryDockAppState) => DiaryDockAppState) => void;

export async function markDocumentReviewed(
  document: VaultDocument,
  updateState: UpdateState
) {
  const reviewedDocument: VaultDocument = {
    ...document,
    reviewStatus: "reviewed",
    reviewReasons: [],
    reviewedAt: "Just now",
    updated: "Just now"
  };
  updateState((current) => ({
    ...current,
    vaultDocuments: current.vaultDocuments.map((item) =>
      item.id === document.id ? reviewedDocument : item
    )
  }));
  await upsertStructuredDocument(reviewedDocument);
}

export async function saveDocumentCorrection({
  document,
  draft,
  repositoryMode,
  shareOptions,
  updateState
}: {
  document: VaultDocument;
  draft: DocumentCorrectionDraft;
  repositoryMode: RepositoryMode;
  shareOptions: HouseholdMember[];
  updateState: UpdateState;
}) {
  const title = draft.title.trim();
  if (!title) return false;
  const nextRoom = draft.roomId ? roomDetails[draft.roomId] : null;
  const previousRoomId = document.roomId;
  const nextActionItems = draft.actionItems
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  const selectedUserIds =
    draft.visibility === "SELECTED_MEMBERS" ? draft.sharedWithUserIds : [];
  const sharedWith = shareOptions
    .filter((member) => member.userId && selectedUserIds.includes(member.userId))
    .map((member) => member.name);
  const correctedDocument: VaultDocument = {
    ...document,
    title,
    issuer: draft.issuer.trim() || undefined,
    category: draft.category,
    roomId: nextRoom?.id,
    roomName: nextRoom?.name,
    dueDate: draft.dueDate.trim(),
    extractionSummary: draft.extractionSummary.trim() || undefined,
    extractedText: draft.extractedText.trim() || undefined,
    actionItems: nextActionItems,
    sharedWith,
    visibility: draft.visibility,
    sharedWithUserIds: selectedUserIds,
    emergencyVisible: draft.emergencyVisible,
    reviewStatus: "reviewed",
    reviewReasons: [],
    reviewedAt: "Just now",
    updated: "Just now"
  };

  if (repositoryMode === "supabase") {
    await upsertStructuredDocument(correctedDocument);
    await setDocumentSharing({
      documentId: document.id,
      visibility: draft.visibility,
      selectedUserIds
    });
  }

  let nextStructuredReminders: Reminder[] = [];
  updateState((current) => {
    const roomDocuments = { ...current.roomDocuments };
    if (previousRoomId) {
      roomDocuments[previousRoomId] = (roomDocuments[previousRoomId] ?? []).filter(
        (item) =>
          item.id !== `${previousRoomId}-${document.id}` && item.title !== document.title
      );
    }
    if (nextRoom) {
      const nextRoomDocument = {
        id: `${nextRoom.id}-${document.id}`,
        title,
        kind: document.kind,
        size: document.size,
        updated: "Just now"
      };
      roomDocuments[nextRoom.id] = [
        nextRoomDocument,
        ...(roomDocuments[nextRoom.id] ?? []).filter(
          (item) => item.id !== nextRoomDocument.id
        )
      ];
    }
    const reminders = current.reminders.map((reminder) =>
      reminder.documentId === document.id
        ? {
            ...reminder,
            documentTitle: title,
            roomId: nextRoom?.id,
            roomName: nextRoom?.name
          }
        : reminder
    );
    nextStructuredReminders = reminders.filter(
      (reminder) => reminder.documentId === document.id
    );
    return {
      ...current,
      vaultDocuments: current.vaultDocuments.map((item) =>
        item.id === document.id ? correctedDocument : item
      ),
      roomDocuments,
      roomActivity: nextRoom
        ? {
            ...current.roomActivity,
            [nextRoom.id]: [
              {
                id: `${nextRoom.id}-correction-${Date.now()}`,
                text:
                  previousRoomId && previousRoomId !== nextRoom.id
                    ? `Moved and corrected ${title}`
                    : `Corrected document details for ${title}`,
                when: "Just now",
                by: "You"
              },
              ...(current.roomActivity[nextRoom.id] ?? [])
            ]
          }
        : current.roomActivity,
      reminders,
      mailboxItems: current.mailboxItems.map((item) =>
        item.title === document.title
          ? {
              ...item,
              title,
              source: draft.issuer.trim() || item.source,
              suggestedRoom: nextRoom?.name ?? item.suggestedRoom
            }
          : item
      )
    };
  });
  await Promise.all(nextStructuredReminders.map(upsertStructuredReminder));
  return true;
}
