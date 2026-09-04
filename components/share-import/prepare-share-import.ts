import type { MailItem } from "@/lib/diarydock-data";
import { uploadPrivateDocument, validateDocumentFile } from "@/lib/document-storage";
import type { RoomActivity, RoomDetail, RoomDocument, VaultDocument } from "@/lib/mock-data";
import {
  formatImportBytes,
  sharedDocumentKind,
  sharedMailKind,
  titleFromSharedName,
  type ImportFile
} from "@/components/share-import/share-import-model";

type PrepareShareImportInput = {
  category: string;
  files: ImportFile[];
  repositoryMode: string;
  room: RoomDetail;
  title: string;
};

export type PreparedShareImport = {
  documents: VaultDocument[];
  mailboxItems: MailItem[];
  roomActivity: RoomActivity[];
  roomDocuments: RoomDocument[];
};

export async function prepareShareImport(input: PrepareShareImportInput): Promise<PreparedShareImport> {
  const documents: VaultDocument[] = [];
  const roomDocuments: RoomDocument[] = [];
  const roomActivity: RoomActivity[] = [];
  const mailboxItems: MailItem[] = [];
  const cleanTitle = input.title.trim() || titleFromSharedName(input.files[0].file.name) || "Shared document";

  for (const [index, item] of input.files.entries()) {
    const validationError = validateDocumentFile(item.file);
    if (validationError) throw new Error(validationError);
    const documentId = crypto.randomUUID();
    const titleSuffix = input.files.length > 1 ? ` ${index + 1}` : "";
    const documentTitle = `${cleanTitle}${titleSuffix}`;
    const storedFile = input.repositoryMode === "supabase" ? await uploadPrivateDocument(item.file, documentId) : null;
    const sizeLabel = formatImportBytes(item.file.size);
    const document: VaultDocument = {
      id: documentId,
      title: documentTitle,
      category: input.category,
      kind: sharedDocumentKind(item.file),
      size: sizeLabel,
      updated: "Just now",
      storageBucket: storedFile?.bucket,
      storagePath: storedFile?.path,
      originalFileName: item.file.name,
      mimeType: item.file.type || "application/octet-stream",
      roomId: input.room.id,
      roomName: input.room.name,
      issuer: "Shared to DiaryDock",
      extractionSummary: "Imported from your phone share sheet. Please review and add any missing details.",
      actionItems: ["Check the title, category, room and any important dates."],
      reviewStatus: "needs-review",
      reviewReasons: ["Shared into DiaryDock — please check details before relying on it."]
    };
    documents.push(document);
    roomDocuments.push({ id: `${input.room.id}-${documentId}`, title: documentTitle, kind: document.kind, size: sizeLabel, updated: "Just now" });
    roomActivity.push({ id: `share-import-${documentId}`, text: `Imported ${documentTitle} from the phone share sheet`, when: "Just now", by: "DiaryDock" });
    mailboxItems.push({
      id: `share-mail-${documentId}`,
      title: documentTitle,
      source: "Phone share sheet",
      kind: sharedMailKind(documentTitle),
      suggestedRoom: input.room.name,
      routeStatus: input.room.id === "mailbox" ? "new" : "room"
    });
  }
  return { documents, mailboxItems, roomActivity, roomDocuments };
}
