import { useEffect, useState } from "react";

import {
  MAX_ANALYSIS_UPLOAD_SIZE,
  prepareCapturePage,
  readCaptureApiPayload
} from "@/components/document-capture/capture-file-preparation";
import type { CaptureStage } from "@/components/document-capture/capture-model";
import { persistCapturedDocument } from "@/components/document-capture/capture-persistence";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import type { DocumentExtractionResult } from "@/lib/document-extraction";
import type { RoomDetail } from "@/lib/mock-data";

export function useDocumentCapture(preferredRoom: RoomDetail | null) {
  const { repositoryMode, updateState } = useDiaryDockData();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [draft, setDraft] = useState<DocumentExtractionResult | null>(null);
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null);
  const [captureJobId, setCaptureJobId] = useState<string | null>(null);
  const [proposalCount, setProposalCount] = useState(0);
  const [stage, setStage] = useState<CaptureStage>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createReminder, setCreateReminder] = useState(false);
  const [reminderTimeLabel, setReminderTimeLabel] = useState("This week");
  const [pendingOriginalFiles, setPendingOriginalFiles] = useState<File[]>([]);
  const [pendingPreparedFiles, setPendingPreparedFiles] = useState<File[]>([]);

  useEffect(() => {
    const urls = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [selectedFiles]);

  const resetResults = () => {
    setDraft(null);
    setSavedDocumentId(null);
    setCaptureJobId(null);
    setProposalCount(0);
    setErrorMessage(null);
    setCreateReminder(false);
    setReminderTimeLabel("This week");
    setPendingOriginalFiles([]);
    setPendingPreparedFiles([]);
    setStage("idle");
  };
  const addPages = (files: File[]) => {
    if (!files.length) return;
    if (stage === "complete" || stage === "error") {
      resetResults();
      setSelectedFiles(files.slice(0, 12));
      return;
    }
    setErrorMessage(null);
    setSelectedFiles((current) => [...current, ...files].slice(0, 12));
  };
  const removePage = (index: number) => {
    setSelectedFiles((current) => current.filter((_, pageIndex) => pageIndex !== index));
  };
  const analyzePages = async () => {
    if (!selectedFiles.length) return;
    setDraft(null);
    setErrorMessage(null);
    setStage("preparing");
    try {
      const pageBudget = Math.max(
        220 * 1024,
        Math.floor(MAX_ANALYSIS_UPLOAD_SIZE / selectedFiles.length)
      );
      const prepared = await Promise.all(
        selectedFiles.map((file) => prepareCapturePage(file, pageBudget))
      );
      setStage("reading");
      const formData = new FormData();
      prepared.forEach((file) => formData.append("files", file));
      const response = await fetch("/api/capture/extract", { method: "POST", body: formData });
      const payload = await readCaptureApiPayload(response);
      if (!response.ok || !payload.extraction) {
        throw new Error(payload.error || "The document could not be analysed.");
      }
      const extraction = preferredRoom
        ? {
            ...payload.extraction,
            suggestedRoom: preferredRoom.name as DocumentExtractionResult["suggestedRoom"]
          }
        : payload.extraction;
      setDraft(extraction);
      setCaptureJobId(payload.captureJobId ?? null);
      setCreateReminder(Boolean(extraction.reminderTitle));
      setReminderTimeLabel(extraction.reminderTimeLabel || "This week");
      setPendingOriginalFiles(selectedFiles);
      setPendingPreparedFiles(prepared);
      setStage("organising");
      await new Promise((resolve) => window.setTimeout(resolve, 1800));
      setStage("review");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to read this document right now.");
      setStage("error");
    }
  };
  const save = async () => {
    if (!draft || !pendingOriginalFiles.length || !pendingPreparedFiles.length) return;
    setStage("saving");
    try {
      const result = await persistCapturedDocument({
        captureJobId,
        createReminder,
        extraction: draft,
        originalFiles: pendingOriginalFiles,
        preparedFiles: pendingPreparedFiles,
        reminderPriority: draft.dueDate ? "high" : "normal",
        reminderTimeLabel: reminderTimeLabel.trim() || "This week",
        repositoryMode,
        updateState
      });
      setSavedDocumentId(result.documentId);
      setProposalCount(result.proposalCount);
      setStage("complete");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `The document could not be saved: ${error.message}`
          : "The document could not be saved. Please try again."
      );
      setStage("error");
    }
  };
  const backWithoutSaving = () => {
    setDraft(null);
    setPendingOriginalFiles([]);
    setPendingPreparedFiles([]);
    setStage("idle");
  };
  const scanAnother = () => {
    setSelectedFiles([]);
    resetResults();
  };
  const retry = () => {
    setStage("idle");
    setErrorMessage(null);
  };

  return {
    addPages, analyzePages, backWithoutSaving, createReminder, draft, errorMessage,
    hasPendingFiles: Boolean(pendingOriginalFiles.length && pendingPreparedFiles.length),
    previewUrls, proposalCount, reminderTimeLabel, removePage, retry, save,
    savedDocumentId, scanAnother, selectedFiles, setCreateReminder, setDraft,
    setReminderTimeLabel, stage
  };
}
