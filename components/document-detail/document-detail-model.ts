import { roomDetails, type Reminder, type VaultDocument } from "@/lib/mock-data";
import type { ResourceVisibility } from "@/lib/resource-access";

export type DocumentCorrectionDraft = {
  actionItems: string;
  category: string;
  dueDate: string;
  emergencyVisible: boolean;
  extractedText: string;
  extractionSummary: string;
  issuer: string;
  roomId: string;
  sharedWithUserIds: string[];
  title: string;
  visibility: ResourceVisibility;
};

export const documentRoomOptions = Object.values(roomDetails)
  .map((room) => ({ id: room.id, name: room.name }))
  .sort((first, second) => first.name.localeCompare(second.name));

export function buildDocumentDraft(document: VaultDocument): DocumentCorrectionDraft {
  return {
    title: document.title,
    issuer: document.issuer ?? "",
    category: document.category,
    roomId: document.roomId ?? "",
    dueDate: document.dueDate ?? "",
    extractionSummary: document.extractionSummary ?? "",
    extractedText: document.extractedText ?? "",
    actionItems: document.actionItems?.join("\n") ?? "",
    visibility:
      document.visibility ?? (document.sharedWith?.length ? "SELECTED_MEMBERS" : "PRIVATE"),
    sharedWithUserIds: document.sharedWithUserIds ?? [],
    emergencyVisible: Boolean(document.emergencyVisible)
  };
}

export function linkedDocumentReminders(document: VaultDocument, reminders: Reminder[]) {
  return reminders
    .filter(
      (item) =>
        item.documentId === document.id ||
        (!item.documentId &&
          (item.roomId === document.roomId || item.title === document.title))
    )
    .slice(0, 3);
}

export function documentFilingDetails(document: VaultDocument) {
  return [
    { label: "Room", value: document.roomName ?? "All Files only" },
    { label: "Category", value: document.category },
    { label: "From", value: document.issuer ?? "Not captured" },
    { label: "Due", value: document.dueDate || "No date" }
  ];
}
