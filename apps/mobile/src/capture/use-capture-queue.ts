import { useCallback, useEffect, useRef, useState } from "react";

import type {
  OfflineStore,
  PendingDocumentUploadSummary,
} from "@diarydock/offline-store";

import { sha256 } from "@mobile/data/offline/binary";

import { analyseCapturedDocuments } from "./analysis-client";
import { combineCapturePages } from "./combine-pages";
import type { CapturedDocument } from "./capture-source";
import { useRestoredCapture } from "./use-restored-capture";

export type CaptureDraft = {
  title: string;
  category: string;
  roomName: string;
  issuer: string;
  dueDate: string;
  summary: string;
  extractedText: string;
  confidence?: number;
  actionItems: string[];
  captureJobId?: string;
  confirmedFields: Array<{ key: string; label: string; value: string; confidence: number }>;
  createReminder: boolean;
  reminderTitle: string;
  reminderTimeLabel: string;
};

function categoryForRoom(roomName: string) {
  if (roomName === "Attic" || roomName === "Family Room") return "Memories";
  if (roomName === "Bedroom") return "Health & Medical";
  if (roomName === "Safe Room") return "Legal & Estate";
  return "Home & Property";
}

function emptyDraft(roomName = "Office"): CaptureDraft {
  return {
    title: "",
    category: categoryForRoom(roomName),
    roomName,
    issuer: "",
    dueDate: "",
    summary: "",
    extractedText: "",
    actionItems: [],
    confirmedFields: [],
    createReminder: false,
    reminderTitle: "",
    reminderTimeLabel: "This week",
  };
}

function defaultTitle(fileName: string) {
  const value = fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  return value ? value.replace(/\b\w/g, (letter) => letter.toUpperCase()).slice(0, 240) : "Scanned document";
}

export function useCaptureQueue(
  store: OfflineStore,
  syncStatus: string,
  synchronize: () => Promise<unknown>,
  accessToken: string,
  initialRoomName?: string,
) {
  const [captures, setCaptures] = useState<CapturedDocument[]>([]);
  const capturesRef = useRef<CapturedDocument[]>([]);
  const [draft, setDraft] = useState<CaptureDraft>(() => emptyDraft(initialRoomName));
  const [uploads, setUploads] = useState<PendingDocumentUploadSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState(false);

  const reload = useCallback(async () => {
    setUploads(await store.listDocumentUploads());
  }, [store]);

  const add = useCallback((incoming: CapturedDocument | CapturedDocument[]) => {
    const additions = Array.isArray(incoming) ? incoming : [incoming];
    setCaptures((current) => {
      const hasPdf = [...current, ...additions].some((item) => item.mimeType === "application/pdf");
      if (current.length + additions.length > 12 || (hasPdf && current.length + additions.length > 1)) {
        additions.forEach((item) => {
          if (item.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
        });
        setError(hasPdf ? "A PDF must be added as one complete document." : "Keep each document to twelve pages or fewer.");
        return current;
      }
      if (!current.length && additions[0]) {
        setDraft({ ...emptyDraft(initialRoomName), title: defaultTitle(additions[0].fileName) });
      }
      setError(null);
      return [...current, ...additions];
    });
  }, [initialRoomName]);

  useRestoredCapture(add);

  useEffect(() => {
    void reload().catch(() => setError("The encrypted upload queue could not be opened."));
  }, [reload, syncStatus]);

  useEffect(() => {
    capturesRef.current = captures;
  }, [captures]);

  useEffect(() => () => {
    capturesRef.current.forEach((item) => {
      if (item.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
    });
  }, []);

  const remove = useCallback((index: number) => {
    setCaptures((current) => {
      const removed = current[index];
      if (removed?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(removed.previewUrl);
      const next = current.filter((_, itemIndex) => itemIndex !== index);
      if (!next.length) setDraft(emptyDraft(initialRoomName));
      return next;
    });
  }, [initialRoomName]);

  const analyse = useCallback(async () => {
    if (!captures.length) return false;
    if (captures.some((capture) => capture.mimeType === "application/pdf")) {
      setError("PDF files can be saved securely, but photographed pages are required for automatic reading.");
      return false;
    }
    setAnalysing(true);
    setError(null);
    try {
      const result = await analyseCapturedDocuments(captures, accessToken);
      const extraction = result.extraction;
      setDraft({
        title: extraction.title || defaultTitle(captures[0]!.fileName),
        category: extraction.category,
        roomName: extraction.suggestedRoom,
        issuer: extraction.issuer,
        dueDate: extraction.dueDate,
        summary: extraction.summary,
        extractedText: extraction.extractedText,
        confidence: extraction.confidence,
        actionItems: extraction.actionItems,
        captureJobId: result.captureJobId,
        confirmedFields: extraction.extractedFields.map((field) => ({
          key: field.key,
          label: field.label,
          value: field.value,
          confidence: field.confidence,
        })),
        createReminder: Boolean(extraction.reminderTitle),
        reminderTitle: extraction.reminderTitle,
        reminderTimeLabel: extraction.reminderTimeLabel || "This week",
      });
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The document could not be analysed securely.");
      return false;
    } finally {
      setAnalysing(false);
    }
  }, [accessToken, captures]);

  const stage = useCallback(async () => {
    if (!captures.length) return false;
    try {
      const selected = await combineCapturePages(captures);
      await store.stageDocumentUpload({
        jobId: crypto.randomUUID(),
        documentId: crypto.randomUUID(),
        fileName: selected.fileName,
        mimeType: selected.mimeType,
        bytes: selected.bytes,
        sha256: await sha256(selected.bytes),
        title: draft.title,
        category: draft.category,
        roomName: draft.roomName,
        details: {
          issuer: draft.issuer || undefined,
          dueDate: draft.dueDate || undefined,
          summary: draft.summary || undefined,
          extractedText: draft.extractedText || undefined,
          confidence: draft.confidence,
          actionItems: draft.actionItems,
          captureJobId: draft.captureJobId,
          confirmedFields: draft.confirmedFields,
          reminder: draft.createReminder && draft.reminderTitle.trim() ? {
            id: crypto.randomUUID(),
            title: draft.reminderTitle.trim(),
            timeLabel: draft.reminderTimeLabel.trim() || "This week",
          } : undefined,
        },
      });
      captures.forEach((item) => {
        if (item.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
      });
      setCaptures([]);
      setDraft(emptyDraft(initialRoomName));
      await reload();
      void synchronize().then(reload);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The document could not be queued safely.");
      return false;
    }
  }, [captures, draft, initialRoomName, reload, store, synchronize]);

  const retry = useCallback(async (jobId: string) => {
    await store.retryDocumentUpload(jobId);
    await reload();
    void synchronize().then(reload);
  }, [reload, store, synchronize]);

  return { add, analyse, analysing, captures, draft, error, remove, retry, setDraft, stage, uploads };
}
