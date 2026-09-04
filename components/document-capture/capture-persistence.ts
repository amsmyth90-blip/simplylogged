import { categoryDocumentKinds, captureRoomIds } from "@/components/document-capture/capture-model";
import { createCapturePdf } from "@/components/document-capture/capture-file-preparation";
import { getCaptureReviewReasons } from "@/lib/capture-review";
import type { DiaryDockAppState, RepositoryMode } from "@/lib/diarydock-data";
import type { DocumentExtractionResult } from "@/lib/document-extraction";
import { uploadPrivateDocument } from "@/lib/document-storage";
import type { Reminder, RoomActivity, RoomDocument, VaultDocument } from "@/lib/mock-data";
import { upsertStructuredDocument, upsertStructuredReminder } from "@/lib/structured-data";

type CaptureSaveOptions = {
  captureJobId: string | null;
  createReminder: boolean;
  extraction: DocumentExtractionResult;
  originalFiles: File[];
  preparedFiles: File[];
  reminderPriority: Reminder["priority"];
  reminderTimeLabel: string;
  repositoryMode: RepositoryMode;
  updateState: (updater: (current: DiaryDockAppState) => DiaryDockAppState) => void;
};

export async function persistCapturedDocument(options: CaptureSaveOptions) {
  const { extraction, originalFiles, preparedFiles } = options;
  const roomId = captureRoomIds[extraction.suggestedRoom] ?? "office";
  const timestamp = Date.now();
  const documentId = crypto.randomUUID();
  const reminderId = crypto.randomUUID();
  const storedUpload =
    originalFiles.length > 1 ? await createCapturePdf(preparedFiles) : originalFiles[0];
  const documentKind: VaultDocument["kind"] =
    originalFiles.length > 1 ? "PDF" : categoryDocumentKinds[extraction.category];
  const totalKb = Math.max(
    1,
    Math.round(originalFiles.reduce((total, file) => total + file.size, 0) / 1024)
  );
  const fileMeta = `${originalFiles.length} page${originalFiles.length === 1 ? "" : "s"} - ${totalKb} KB`;
  const storedFile =
    options.repositoryMode === "supabase"
      ? await uploadPrivateDocument(storedUpload, documentId)
      : null;
  const nextDocument: VaultDocument = {
    id: documentId,
    title: extraction.title,
    category: extraction.category,
    kind: documentKind,
    size: fileMeta,
    updated: "Just now",
    storageBucket: storedFile?.bucket,
    storagePath: storedFile?.path,
    originalFileName: storedUpload.name,
    mimeType: storedUpload.type || "application/octet-stream",
    roomId,
    roomName: extraction.suggestedRoom,
    issuer: extraction.issuer,
    dueDate: extraction.dueDate,
    extractionSummary: extraction.summary,
    extractedText: extraction.extractedText,
    actionItems: extraction.actionItems,
    confidence: extraction.confidence,
    reviewStatus: "reviewed",
    reviewReasons: getCaptureReviewReasons(extraction),
    reviewedAt: new Date().toISOString()
  };
  const nextRoomDocument: RoomDocument = {
    id: `${roomId}-${documentId}`,
    title: extraction.title,
    kind: documentKind,
    size: fileMeta,
    updated: "Just now"
  };
  const nextActivity: RoomActivity = {
    id: `capture-activity-${timestamp}`,
    text: `DiaryDock read ${originalFiles.length} page${originalFiles.length === 1 ? "" : "s"}, filed ${extraction.title}, and stored the original`,
    when: "Just now",
    by: "DiaryDock"
  };
  const reminderNote = [
    extraction.issuer,
    extraction.summary,
    extraction.dueDate ? `Due: ${extraction.dueDate}` : ""
  ]
    .filter(Boolean)
    .join(" - ");
  const nextReminder: Reminder | null = options.createReminder
    ? {
        id: reminderId,
        title: extraction.reminderTitle || `Follow up on ${extraction.title}`,
        note: reminderNote,
        roomId,
        roomName: extraction.suggestedRoom,
        group:
          options.reminderTimeLabel === "Today"
            ? "today"
            : options.reminderTimeLabel.includes("month")
              ? "later"
              : "week",
        timeLabel: options.reminderTimeLabel,
        priority: options.reminderPriority,
        documentId,
        documentTitle: extraction.title
      }
    : null;

  options.updateState((current) => ({
    ...current,
    vaultDocuments: [nextDocument, ...current.vaultDocuments],
    reminders: nextReminder ? [nextReminder, ...current.reminders] : current.reminders,
    roomDocuments: {
      ...current.roomDocuments,
      [roomId]: [nextRoomDocument, ...(current.roomDocuments[roomId] ?? [])]
    },
    roomActivity: {
      ...current.roomActivity,
      [roomId]: [nextActivity, ...(current.roomActivity[roomId] ?? [])]
    },
    mailboxItems: [
      {
        id: `capture-mail-${timestamp}`,
        title: extraction.title,
        source: extraction.issuer || "Mobile capture",
        kind: extraction.detectedDocumentType.toLowerCase().includes("bill")
          ? "Bill"
          : extraction.detectedDocumentType.toLowerCase().includes("form")
            ? "Form"
            : extraction.detectedDocumentType.toLowerCase().includes("statement")
              ? "Statement"
              : "Letter",
        suggestedRoom: extraction.suggestedRoom,
        routeStatus: options.createReminder ? "reminder" : "room"
      },
      ...current.mailboxItems
    ]
  }));

  let proposalCount = 0;
  if (options.repositoryMode === "supabase") {
    await upsertStructuredDocument(nextDocument);
    if (nextReminder) await upsertStructuredReminder(nextReminder);
    if (options.captureJobId) {
      const response = await fetch("/api/capture/jobs/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          captureJobId: options.captureJobId,
          documentId,
          confirmedFields: (extraction.extractedFields ?? []).map((field) => ({
            ...field,
            userConfirmed: true
          }))
        })
      });
      const confirmation = (await response.json().catch(() => ({}))) as {
        proposalCount?: number;
      };
      proposalCount =
        typeof confirmation.proposalCount === "number" ? confirmation.proposalCount : 0;
    }
  }
  return { documentId, proposalCount };
}
